package com.bihome.reminder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.messaging.MessageSender;
import com.bihome.resident.ApartmentResident;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums;
import com.bihome.resident.ResidentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ReminderControllerIT extends AbstractIT {

    @Autowired
    ResidentRepository residentRepository;

    @Autowired
    ReminderRepository reminderRepository;

    @Autowired
    ReminderService reminderService;

    @MockitoSpyBean
    MessageSender messageSender;

    private Building tower;
    private Apartment floor3;
    private Apartment floor5;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        floor3 = createApartment(tower.getId(), "A0301");
        Apartment other = createApartment(tower.getId(), "A0501");
        other.setFloorNo("5");
        floor5 = apartmentRepository.saveAndFlush(other);
        floor3.setFloorNo("3");
        floor3 = apartmentRepository.saveAndFlush(floor3);
        resident("Nguyễn An", "0912000001", "an@example.com", floor3);
        resident("Trần Bình", "0912000002", null, floor3);
        resident("Lê Cường", "0912000003", "cuong@example.com", floor5);
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
    }

    @Test
    void sendNowDeliversPerResidentAndChannelAndSkipsMissingEmail() throws Exception {
        send(post("/api/v1/reminders/preview-recipients"), Map.of("audience", "FLOOR", "targets", List.of("3")))
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.withEmail").value(1));
        send(post("/api/v1/reminders/preview-recipients"), Map.of("audience", "FLOOR", "targets", List.of("99")))
                .andExpect(status().isBadRequest());

        Map<String, Object> body = reminder("FLOOR", List.of("3"), "NOW");
        JsonNode sent = json(send(post("/api/v1/reminders"), body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.recipientCount").value(2))
                .andExpect(jsonPath("$.runCount").value(1))
                .andExpect(jsonPath("$.targetLabel").value("Tầng 3")));
        assertThat(sent.get("content").asText()).isEqualTo("<p>Hạn đóng phí <b>ngày 10</b></p>");

        JsonNode deliveries = json(mvc.perform(get("/api/v1/reminders/{id}/deliveries", sent.get("id").asLong())
                .header(HttpHeaders.AUTHORIZATION, bearer(token)).param("size", "10")));
        assertThat(deliveries.get("totalElements").asInt()).isEqualTo(4);
        assertThat(deliveries.toString()).contains("\"residentName\":\"Trần Bình\",\"apartmentCode\":\"A0301\",\"channel\":\"EMAIL\"",
                "\"status\":\"SKIPPED\",\"note\":\"Không có email\"");
        verify(messageSender).send(eq(MessageSender.Channel.EMAIL), eq("an@example.com"), eq("Nhắc đóng phí"), anyString());

        send(delete("/api/v1/reminders/{id}", sent.get("id").asLong()), null).andExpect(status().isConflict());
    }

    @Test
    void scheduledAndMonthlyRemindersAreSentByTheJob() throws Exception {
        Map<String, Object> once = reminder("ALL", List.of(), "ONCE");
        once.put("scheduledAt", OffsetDateTime.now().minusMinutes(1));
        send(post("/api/v1/reminders"), once).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("scheduledAt"));
        once.put("scheduledAt", OffsetDateTime.now().plusHours(1));
        long onceId = json(send(post("/api/v1/reminders"), once).andExpect(jsonPath("$.status").value("SCHEDULED"))).get("id").asLong();

        Map<String, Object> monthly = reminder("ALL", List.of(), "MONTHLY");
        monthly.put("monthlyDay", 31);
        monthly.put("monthlyTime", "09:00");
        JsonNode m = json(send(post("/api/v1/reminders"), monthly).andExpect(jsonPath("$.status").value("SCHEDULED")));
        assertThat(m.get("nextRunAt").asText()).isNotBlank();

        // Đến hạn: job gửi, hẹn giờ một lần → Đã gửi, hằng tháng → lần kế tiếp.
        for (long id : List.of(onceId, m.get("id").asLong())) {
            Reminder r = reminderRepository.findById(id).orElseThrow();
            r.setNextRunAt(OffsetDateTime.now().minusMinutes(1));
            reminderRepository.saveAndFlush(r);
        }
        assertThat(reminderService.sendDue()).isGreaterThanOrEqualTo(2);
        Reminder doneOnce = reminderRepository.findById(onceId).orElseThrow();
        assertThat(doneOnce.getStatus()).isEqualTo(Reminder.Status.SENT);
        assertThat(doneOnce.getRecipientCount()).isEqualTo(3);
        Reminder nextMonthly = reminderRepository.findById(m.get("id").asLong()).orElseThrow();
        assertThat(nextMonthly.getStatus()).isEqualTo(Reminder.Status.SCHEDULED);
        assertThat(nextMonthly.getRunCount()).isEqualTo(1);
        assertThat(nextMonthly.getNextRunAt()).isAfter(OffsetDateTime.now());

        // Huỷ rồi xoá.
        send(post("/api/v1/reminders/{id}/cancel", nextMonthly.getId()), Map.of("version", nextMonthly.getVersion()))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        send(delete("/api/v1/reminders/{id}", nextMonthly.getId()), null).andExpect(status().isNoContent());
    }

    private void resident(String name, String phone, String email, Apartment apartment) {
        Resident r = new Resident();
        r.setBuildingId(tower.getId());
        r.setCode(unique("R").substring(0, 9));
        r.setFullName(name);
        r.setPhone(phone);
        r.setEmail(email);
        r.setAppAccountStatus(ResidentEnums.AppAccountStatus.NONE);
        ApartmentResident link = new ApartmentResident();
        link.setApartmentId(apartment.getId());
        link.setRole(ResidentEnums.ResidentRole.OWNER);
        link.setMoveInDate(LocalDate.now().minusYears(1));
        link.setResidenceStatus(ResidentEnums.ResidenceStatus.LIVING);
        link.setResident(r);
        r.getApartments().add(link);
        residentRepository.saveAndFlush(r);
    }

    private static Map<String, Object> reminder(String audience, List<String> targets, String scheduleType) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Nhắc đóng phí");
        body.put("content", "<p onclick=\"x()\">Hạn đóng phí <b>ngày 10</b><script>alert(1)</script></p>");
        body.put("audience", audience);
        body.put("targets", targets);
        body.put("channels", List.of("IN_APP", "EMAIL"));
        body.put("scheduleType", scheduleType);
        body.put("draft", false);
        return body;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
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
