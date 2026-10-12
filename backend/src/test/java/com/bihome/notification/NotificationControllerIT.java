package com.bihome.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.bihome.user.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class NotificationControllerIT extends AbstractIT {

    @Autowired
    AnnouncementRepository announcementRepository;

    @Autowired
    AnnouncementService announcementService;

    private Building tower;
    private String managerToken;
    private AppUser staff;
    private String staffToken;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        managerToken = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        staff = createUser(unique("nv"), Set.of(tower.getId()), "STAFF");
        staffToken = login(staff.getUsername());
    }

    @Test
    void newTicketsNotifyHandlersOfTheBuildingWhoCanMarkThemRead() throws Exception {
        long categoryId = json(send(managerToken, post("/api/v1/ticket-categories"), Map.of("name", unique("Điện "),
                "responseSlaHours", 2, "resolutionSlaHours", 24, "status", "ACTIVE"))).get("id").asLong();
        Map<String, Object> ticket = new HashMap<>();
        ticket.put("title", "Mất điện hành lang");
        ticket.put("categoryId", categoryId);
        ticket.put("channel", "HOTLINE");
        ticket.put("priority", "HIGH");
        ticket.put("fileIds", List.of());
        long ticketId = json(send(managerToken, post("/api/v1/tickets"), ticket).andExpect(status().isCreated()))
                .at("/ticket/id").asLong();

        mvc.perform(get("/api/v1/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(jsonPath("$.count").value(1));
        JsonNode list = json(mvc.perform(get("/api/v1/notifications").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))));
        JsonNode first = list.at("/content/0");
        assertThat(first.get("type").asText()).isEqualTo("TICKET_CREATED");
        assertThat(first.get("title").asText()).startsWith("Yêu cầu mới YC-");
        assertThat(first.get("link").asText()).isEqualTo("/tickets/" + ticketId);
        assertThat(first.get("read").asBoolean()).isFalse();
        // Người tạo không tự nhận thông báo của mình.
        mvc.perform(get("/api/v1/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
                .andExpect(jsonPath("$.count").value(0));

        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        mvc.perform(post("/api/v1/notifications/{id}/read", first.get("id").asLong())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/notifications/{id}/read", first.get("id").asLong())
                        .header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(jsonPath("$.read").value(true));
        mvc.perform(get("/api/v1/notifications/unread-count").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void announcementsAreDraftedScheduledAndSentToStaffOfTheBuilding() throws Exception {
        send(managerToken, post("/api/v1/announcements"), announcement(OffsetDateTime.now().minusMinutes(5)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("scheduledAt"));
        JsonNode draft = json(send(managerToken, post("/api/v1/announcements"), announcement(null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT")));

        JsonNode sent = json(send(managerToken, post("/api/v1/announcements/{id}/send", draft.get("id").asLong()),
                Map.of("version", draft.get("version").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.staffCount").value(1)));
        assertThat(sent.get("sentAt").isNull()).isFalse();
        mvc.perform(get("/api/v1/notifications").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(jsonPath("$.content[0].type").value("ANNOUNCEMENT"))
                .andExpect(jsonPath("$.content[0].link").value("/announcements?view=" + draft.get("id").asLong()));
        Map<String, Object> edit = announcement(null);
        edit.put("version", sent.get("version").asLong());
        send(managerToken, put("/api/v1/announcements/{id}", draft.get("id").asLong()), edit).andExpect(status().isConflict());
        send(managerToken, delete("/api/v1/announcements/{id}", draft.get("id").asLong()), null).andExpect(status().isConflict());

        // Hẹn giờ: đến giờ thì job gửi.
        JsonNode scheduled = json(send(managerToken, post("/api/v1/announcements"), announcement(OffsetDateTime.now().plusHours(1)))
                .andExpect(jsonPath("$.status").value("SCHEDULED")));
        Announcement due = announcementRepository.findById(scheduled.get("id").asLong()).orElseThrow();
        due.setScheduledAt(OffsetDateTime.now().minusMinutes(1));
        announcementRepository.saveAndFlush(due);
        assertThat(announcementService.sendDue()).isGreaterThanOrEqualTo(1);
        assertThat(announcementRepository.findById(due.getId()).orElseThrow().getStatus()).isEqualTo(Announcement.Status.SENT);

        // Kế toán chỉ xem, không soạn được.
        String accountant = login(createUser(unique("kt"), Set.of(tower.getId()), "ACCOUNTANT").getUsername());
        send(accountant, post("/api/v1/announcements"), announcement(null)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/announcements").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    private static Map<String, Object> announcement(OffsetDateTime scheduledAt) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Cắt nước bảo trì bể ngầm");
        body.put("content", "Ban quản lý thông báo cắt nước từ 8h đến 11h ngày mai.");
        body.put("category", "MAINTENANCE");
        body.put("audience", "ALL");
        body.put("scheduledAt", scheduledAt);
        body.put("fileIds", List.of());
        return body;
    }

    private ResultActions send(String token, MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, bearer(token)).header("X-Building-Id", tower.getId().toString());
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
