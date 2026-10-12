package com.bihome.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.bihome.user.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class AuditLogControllerIT extends AbstractIT {

    private Building tower;
    private String token;
    private String username;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        username = unique("bqm");
        token = login(createUser(username, Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
    }

    @Test
    void createUpdateStatusAndDeleteAreRecordedWithChangedFields() throws Exception {
        String code = unique("GYM").toUpperCase();
        JsonNode created = json(send(post("/api/v1/amenities"), amenity(code, "Tầng 5")).andExpect(status().isCreated()));
        long id = created.get("id").asLong();
        Map<String, Object> update = amenity(code, "Tầng 6");
        update.put("version", created.get("version").asLong());
        JsonNode updated = json(send(put("/api/v1/amenities/{id}", id), update).andExpect(status().isOk()));
        send(patch("/api/v1/amenities/{id}/status", id), Map.of("status", "INACTIVE")).andExpect(status().isOk());
        send(delete("/api/v1/amenities/{id}", id), null).andExpect(status().isNoContent());
        assertThat(updated.get("location").asText()).isEqualTo("Tầng 6");

        JsonNode logs = json(mvc.perform(get("/api/v1/audit-logs").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString())
                        .param("entityType", "AMENITY").param("entityId", String.valueOf(id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.content[*].action", Matchers.contains("DELETE", "STATUS_CHANGE", "UPDATE", "CREATE"))));
        JsonNode update1 = logs.at("/content/2");
        assertThat(update1.get("actorUsername").asText()).isEqualTo(username);
        assertThat(update1.get("entityLabel").asText()).isEqualTo(code + " · Phòng gym");
        assertThat(update1.get("buildingId").asLong()).isEqualTo(tower.getId());
        assertThat(update1.at("/changes/0/field").asText()).isEqualTo("location");
        assertThat(update1.at("/changes/0/oldValue").asText()).isEqualTo("Tầng 5");
        assertThat(update1.at("/changes/0/newValue").asText()).isEqualTo("Tầng 6");
        assertThat(logs.at("/content/1/changes/0/newValue").asText()).isEqualTo("INACTIVE");
    }

    @Test
    void collectionChangesAndSensitiveFieldsAreRecordedButOtherBuildingsAndUsersAreHidden() throws Exception {
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        AppUser staff = createUser(unique("nv"), Set.of(tower.getId()), "STAFF");
        mvc.perform(put("/api/v1/users/{id}/roles", staff.getId()).header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("roleCodes", List.of("STAFF", "ACCOUNTANT")))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/users/{id}/reset-password", staff.getId()).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk());

        JsonNode userLogs = json(mvc.perform(get("/api/v1/audit-logs").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .param("entityType", "USER").param("entityId", String.valueOf(staff.getId()))));
        assertThat(userLogs.toString()).contains("\"field\":\"roles\"", "\"newValue\":\"ACCOUNTANT, STAFF\"",
                "\"field\":\"passwordHash\",\"oldValue\":\"***\",\"newValue\":\"***\"");
        assertThat(userLogs.toString()).doesNotContain("$2a$");

        // Quản lý tòa không thấy thay đổi người dùng và dữ liệu của tòa khác.
        Building other = createBuilding();
        mvc.perform(post("/api/v1/amenities").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .header("X-Building-Id", other.getId().toString()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(amenity(unique("X").toUpperCase(), "Tầng 1"))))
                .andExpect(status().isCreated());
        JsonNode mine = json(mvc.perform(get("/api/v1/audit-logs").header(HttpHeaders.AUTHORIZATION, bearer(token))
                .param("size", "50")));
        for (JsonNode log : mine.get("content")) {
            assertThat(log.get("module").asText()).isNotIn("USER", "ROLE");
            if (log.hasNonNull("buildingId")) {
                assertThat(log.get("buildingId").asLong()).isEqualTo(tower.getId());
            }
        }
        mvc.perform(get("/api/v1/audit-logs").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", other.getId().toString()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/login-history").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/login-history").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("keyword", username))
                .andExpect(jsonPath("$.content[0].loginName").value(username))
                .andExpect(jsonPath("$.content[0].success").value(true));
    }

    private static Map<String, Object> amenity(String code, String location) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Phòng gym");
        body.put("location", location);
        body.put("capacity", 20);
        body.put("openTime", "06:00");
        body.put("closeTime", "21:00");
        body.put("requiresApproval", false);
        body.put("status", "ACTIVE");
        body.put("images", List.of());
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
