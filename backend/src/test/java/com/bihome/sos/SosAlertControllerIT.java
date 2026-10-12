package com.bihome.sos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.notification.NotificationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
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

class SosAlertControllerIT extends AbstractIT {

    @Autowired
    NotificationRepository notifications;

    private Building tower;
    private Apartment a1;
    private String token;
    private Long staffId;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        token = login(createUser(unique("bql"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        staffId = createUser(unique("baove"), Set.of(tower.getId()), "STAFF").getId();
    }

    @Test
    void createAcknowledgeResolveAndNotifyStaff() throws Exception {
        send(post("/api/v1/sos-alerts"), Map.of("alertType", "FIRE")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("location"));

        JsonNode a = json(send(post("/api/v1/sos-alerts"), Map.of("alertType", "MEDICAL", "apartmentId", a1.getId(),
                "reporterName", "Nguyễn Văn An", "reporterPhone", "+84901234567", "description", "Người già ngất xỉu"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.apartmentCode").value("A1"))
                .andExpect(jsonPath("$.reporterPhone").value("0901234567")));
        // Không có căn hộ: tìm theo vị trí vẫn ra (không bị mất dòng vì join căn hộ).
        send(post("/api/v1/sos-alerts"), Map.of("alertType", "ELEVATOR", "location", "Thang máy số 2 kẹt tầng 7"))
                .andExpect(status().isCreated());
        send(get("/api/v1/sos-alerts").param("keyword", "Thang máy"), null).andExpect(jsonPath("$.totalElements").value(1));
        send(get("/api/v1/sos-alerts/active"), null)
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.newCount").value(2));
        long id = a.get("id").asLong();
        assertThat(notifications.findAll()).anyMatch(n -> n.getRecipientId().equals(staffId)
                && n.getLink().equals("/sos-alerts?view=" + id));

        a = json(send(post("/api/v1/sos-alerts/{id}/acknowledge", id), Map.of("version", a.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("ACKNOWLEDGED")));
        send(post("/api/v1/sos-alerts/{id}/acknowledge", id), Map.of("version", a.get("version").asLong()))
                .andExpect(status().isConflict());
        send(post("/api/v1/sos-alerts/{id}/resolve", id), Map.of("status", "RESOLVED", "note", " ", "version",
                a.get("version").asLong())).andExpect(status().isBadRequest());
        send(post("/api/v1/sos-alerts/{id}/resolve", id), Map.of("status", "RESOLVED", "note",
                "Đã gọi 115, đưa đi viện", "version", a.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolvedBy").isString());
        send(get("/api/v1/sos-alerts/active"), null).andExpect(jsonPath("$.count").value(1));
        send(get("/api/v1/sos-alerts?open=true"), null).andExpect(jsonPath("$.totalElements").value(1));

        Building other = createBuilding();
        String outsider = login(createUser(unique("bql2"), Set.of(other.getId()), "BUILDING_MANAGER").getUsername());
        mvc.perform(get("/api/v1/sos-alerts/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/sos-alerts/active").header(HttpHeaders.AUTHORIZATION, bearer(outsider))
                .header("X-Building-Id", other.getId().toString())).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void pinnedPagesArePerUser() throws Exception {
        mvc.perform(put("/api/v1/profile/pinned-pages").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of("pages", List.of(
                        Map.of("path", "/fee-notices", "title", "Thông báo phí"),
                        Map.of("path", "/sos-alerts", "title", "Cảnh báo SOS"),
                        Map.of("path", "/fee-notices", "title", "Trùng"))))))
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(put("/api/v1/profile/pinned-pages").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of("pages", List.of(
                        Map.of("path", "https://evil.example", "title", "X"))))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/profile/pinned-pages").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[1].path").value("/sos-alerts"));
        String other = login(createUser(unique("nv"), Set.of(tower.getId()), "STAFF").getUsername());
        mvc.perform(get("/api/v1/profile/pinned-pages").header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(jsonPath("$.length()").value(0));
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
