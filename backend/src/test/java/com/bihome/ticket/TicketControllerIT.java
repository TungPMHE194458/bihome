package com.bihome.ticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.storage.FileAttachmentRepository;
import com.bihome.user.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class TicketControllerIT extends AbstractIT {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    @Autowired
    TicketRepository ticketRepository;

    @Autowired
    FileAttachmentRepository fileRepository;

    private Building tower;
    private Apartment a1;
    private AppUser manager;
    private String token;
    private long categoryId;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        manager = createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER");
        token = login(manager.getUsername());
        categoryId = id(createCategory(unique("Điện "), 2, 24, null));
    }

    @Test
    void defaultCategoriesAreSeededAndSlaMustBeConsistent() throws Exception {
        mvc.perform(get("/api/v1/ticket-categories/options").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].name", Matchers.hasItems("Điện", "Nước", "Thang máy", "Góp ý")));
        createCategory(unique("Sai SLA "), 24, 2, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("resolutionSlaHours"));
        createCategory("ĐIỆN", 1, 2, null).andExpect(status().isConflict());
    }

    @Test
    void createGeneratesDailyCodesComputesSlaAndAppliesTheDefaultAssignee() throws Exception {
        long withDefault = id(createCategory(unique("Nước "), 1, 8, manager.getId()));
        String day = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("yyMMdd"));

        JsonNode first = json(create(body(withDefault)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticket.code", Matchers.matchesPattern("YC-" + day + "-\\d{3,}")))
                .andExpect(jsonPath("$.ticket.status").value("NEW"))
                .andExpect(jsonPath("$.ticket.assigneeId").value(manager.getId()))
                .andExpect(jsonPath("$.ticket.apartmentCode").value("A1"))
                .andExpect(jsonPath("$.allowedStatuses", Matchers.contains("RECEIVED", "IN_PROGRESS", "CANCELLED")))
                .andReturn());
        JsonNode second = json(create(body(categoryId)).andReturn());

        int n1 = Integer.parseInt(first.at("/ticket/code").asText().substring(10));
        int n2 = Integer.parseInt(second.at("/ticket/code").asText().substring(10));
        assertThat(n2).isEqualTo(n1 + 1);
        OffsetDateTime created = OffsetDateTime.parse(first.at("/ticket/createdAt").asText());
        OffsetDateTime due = OffsetDateTime.parse(first.at("/ticket/resolutionDueAt").asText());
        assertThat(java.time.Duration.between(created, due).toMinutes()).isBetween(8 * 60 - 1L, 8 * 60 + 1L);
        assertThat(second.at("/ticket/assigneeId").isMissingNode()).isTrue();
    }

    @Test
    void statusFollowsTheStateMachineAndTheTimelineRecordsEverything() throws Exception {
        JsonNode t = json(create(body(categoryId)).andReturn());
        long id = t.at("/ticket/id").asLong();

        changeStatus(id, "DONE", null).andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Không thể chuyển từ \"Mới\" sang \"Hoàn thành\"."));
        changeStatus(id, "RECEIVED", null).andExpect(jsonPath("$.ticket.status").value("RECEIVED"))
                .andExpect(jsonPath("$.respondedAt").isNotEmpty());
        changeStatus(id, "IN_PROGRESS", "Đã cử kỹ thuật")
                .andExpect(jsonPath("$.ticket.assigneeId").value(manager.getId()));
        changeStatus(id, "WAITING", "Chờ cư dân có nhà");
        changeStatus(id, "IN_PROGRESS", null);
        changeStatus(id, "DONE", null).andExpect(jsonPath("$.resolvedAt").isNotEmpty())
                .andExpect(jsonPath("$.allowedStatuses", Matchers.contains("IN_PROGRESS", "CLOSED")));
        send(put("/api/v1/tickets/{id}/rating", id), Map.of("rating", 5, "comment", "Nhanh"))
                .andExpect(jsonPath("$.ticket.rating").value(5));
        changeStatus(id, "CLOSED", null).andExpect(jsonPath("$.closedAt").isNotEmpty())
                .andExpect(jsonPath("$.allowedStatuses").isEmpty());
        send(put("/api/v1/tickets/{id}/assignee", id), Map.of("version", version(id)))
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(get("/api/v1/tickets/{id}/timeline", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].type", Matchers.contains("CREATED", "STATUS_CHANGE", "ASSIGNMENT",
                        "STATUS_CHANGE", "STATUS_CHANGE", "STATUS_CHANGE", "STATUS_CHANGE", "RATING", "STATUS_CHANGE")))
                .andExpect(jsonPath("$[2].assigneeName").isNotEmpty())
                .andExpect(jsonPath("$[3].content").value("Đã cử kỹ thuật"))
                .andExpect(jsonPath("$[7].content").value("5 sao — Nhanh"))
                .andExpect(jsonPath("$[0].actorUsername").value(manager.getUsername()));
    }

    @Test
    void cancelNeedsAReasonAndOnlyNewOrCancelledTicketsCanBeDeleted() throws Exception {
        long id = json(create(body(categoryId)).andReturn()).at("/ticket/id").asLong();
        changeStatus(id, "RECEIVED", null);
        mvc.perform(delete("/api/v1/tickets/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());
        changeStatus(id, "CANCELLED", " ").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("note"));
        changeStatus(id, "CANCELLED", "Cư dân tự xử lý").andExpect(jsonPath("$.ticket.status").value("CANCELLED"));
        mvc.perform(delete("/api/v1/tickets/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    @Test
    void assigneesMustWorkInTheBuilding() throws Exception {
        long id = json(create(body(categoryId)).andReturn()).at("/ticket/id").asLong();
        AppUser staff = createUser(unique("nv"), Set.of(tower.getId()), "STAFF");
        AppUser elsewhere = createUser(unique("nv"), Set.of(createBuilding().getId()), "STAFF");
        AppUser accountant = createUser(unique("kt"), Set.of(tower.getId()), "ACCOUNTANT");

        mvc.perform(get("/api/v1/tickets/assignees").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(jsonPath("$[*].id", Matchers.hasItems(staff.getId().intValue(), manager.getId().intValue())))
                .andExpect(jsonPath("$[*].id", Matchers.not(Matchers.hasItem(elsewhere.getId().intValue()))))
                .andExpect(jsonPath("$[*].id", Matchers.not(Matchers.hasItem(accountant.getId().intValue()))));

        send(put("/api/v1/tickets/{id}/assignee", id), Map.of("assigneeId", elsewhere.getId(), "version", version(id)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("assigneeId"));
        send(put("/api/v1/tickets/{id}/assignee", id), Map.of("assigneeId", staff.getId(), "version", version(id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket.assigneeId").value(staff.getId()));

        String staffToken = login(staff.getUsername());
        mvc.perform(get("/api/v1/tickets").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .param("assigneeId", staff.getId().toString()))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void commentsAndTicketFilesAreKeptInTheTimelineAndRemovedFilesAreDeleted() throws Exception {
        long photo = upload("hong-den.png");
        Map<String, Object> b = body(categoryId);
        b.put("fileIds", List.of(photo));
        JsonNode t = json(create(b).andExpect(jsonPath("$.attachments[0].name").value("hong-den.png")).andReturn());
        long id = t.at("/ticket/id").asLong();

        long commentFile = upload("bien-ban.png");
        send(post("/api/v1/tickets/{id}/comments", id),
                Map.of("content", "Đã thay bóng đèn", "visibility", "PUBLIC", "fileIds", List.of(commentFile)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("COMMENT"))
                .andExpect(jsonPath("$.attachments[0].name").value("bien-ban.png"));
        send(post("/api/v1/tickets/{id}/comments", id), Map.of("content", "Ghi chú nội bộ", "visibility", "INTERNAL"));

        mvc.perform(get("/api/v1/tickets/{id}/timeline", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[1].visibility").value("PUBLIC"))
                .andExpect(jsonPath("$[1].attachments[0].fileId").value(commentFile))
                .andExpect(jsonPath("$[2].visibility").value("INTERNAL"));
        // Ảnh của bình luận không lẫn vào ảnh của yêu cầu.
        mvc.perform(get("/api/v1/tickets/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.attachments.length()").value(1));

        Map<String, Object> update = body(categoryId);
        update.put("fileIds", List.of());
        update.put("version", version(id));
        send(put("/api/v1/tickets/{id}", id), update).andExpect(jsonPath("$.attachments").isEmpty());
        assertThat(fileRepository.findById(photo)).isEmpty();
        assertThat(fileRepository.findById(commentFile)).isPresent();
    }

    @Test
    void listFiltersAndBoardGroupByStatus() throws Exception {
        long lateId = json(create(body(categoryId)).andReturn()).at("/ticket/id").asLong();
        Ticket late = ticketRepository.findById(lateId).orElseThrow();
        late.setResponseDueAt(OffsetDateTime.now().minusHours(3));
        late.setResolutionDueAt(OffsetDateTime.now().minusHours(1));
        ticketRepository.saveAndFlush(late);
        Map<String, Object> urgent = body(categoryId);
        urgent.put("priority", "URGENT");
        urgent.put("title", "Kẹt thang máy");
        long urgentId = json(create(urgent).andReturn()).at("/ticket/id").asLong();
        changeStatus(urgentId, "IN_PROGRESS", null);

        list(Map.of("overdue", "true")).andExpect(jsonPath("$.content[*].id", Matchers.contains((int) lateId)))
                .andExpect(jsonPath("$.content[0].overdue").value(true));
        list(Map.of("priority", "URGENT")).andExpect(jsonPath("$.content[*].title", Matchers.contains("Kẹt thang máy")));
        list(Map.of("status", "IN_PROGRESS")).andExpect(jsonPath("$.totalElements").value(1));
        list(Map.of("unassigned", "true")).andExpect(jsonPath("$.content[*].id", Matchers.contains((int) lateId)));
        list(Map.of("apartment", "a1")).andExpect(jsonPath("$.totalElements").value(2));
        list(Map.of("keyword", "thang máy")).andExpect(jsonPath("$.totalElements").value(1));

        mvc.perform(get("/api/v1/tickets/board").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$[0].status").value("NEW"))
                .andExpect(jsonPath("$[0].total").value(1))
                .andExpect(jsonPath("$[2].status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$[2].items[0].title").value("Kẹt thang máy"));
    }

    @Test
    void ticketsOfOtherBuildingsAreHiddenAndBlockApartmentDeletion() throws Exception {
        create(body(categoryId)).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/apartments/{id}", a1.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Căn hộ có 1 yêu cầu hỗ trợ, hãy chuyển sang Không hoạt động."));

        Building other = createBuilding();
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        Map<String, Object> foreignBody = body(categoryId);
        foreignBody.remove("apartmentId");
        long foreign = json(mvc.perform(post("/api/v1/tickets").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .header("X-Building-Id", other.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(foreignBody))).andReturn()).at("/ticket/id").asLong();

        mvc.perform(get("/api/v1/tickets/{id}", foreign).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        list(Map.of()).andExpect(jsonPath("$.totalElements").value(1));
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> body(long category) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Mất điện căn A1");
        body.put("description", "Mất điện từ 8h sáng");
        body.put("categoryId", category);
        body.put("apartmentId", a1.getId());
        body.put("channel", "HOTLINE");
        body.put("priority", "HIGH");
        body.put("fileIds", List.of());
        return body;
    }

    private long version(long id) {
        return ticketRepository.findById(id).orElseThrow().getVersion();
    }

    private ResultActions changeStatus(long id, String status, String note) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status);
        body.put("note", note);
        body.put("version", version(id));
        return send(post("/api/v1/tickets/{id}/status", id), body);
    }

    private ResultActions createCategory(String name, int response, int resolution, Long assigneeId) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("responseSlaHours", response);
        body.put("resolutionSlaHours", resolution);
        body.put("defaultAssigneeId", assigneeId);
        body.put("status", "ACTIVE");
        return send(post("/api/v1/ticket-categories"), body);
    }

    private ResultActions create(Map<String, Object> body) throws Exception {
        return send(post("/api/v1/tickets"), body);
    }

    private long upload(String name) throws Exception {
        MvcResult result = mvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", name, "image/png", PNG))
                        .param("purpose", "TICKET_ATTACHMENT")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isCreated())
                .andReturn();
        return json(result).get("id").asLong();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions list(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/tickets")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString());
        params.forEach(request::param);
        return mvc.perform(request);
    }

    private long id(ResultActions actions) throws Exception {
        return json(actions.andReturn()).get("id").asLong();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
