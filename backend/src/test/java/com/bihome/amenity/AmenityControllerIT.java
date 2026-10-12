package com.bihome.amenity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class AmenityControllerIT extends AbstractIT {

    private Building tower;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
    }

    @Test
    void createReturnsHhmmTimesAndADefaultConfigWithoutSlots() throws Exception {
        String code = unique("pool");
        long id = id(send(post("/api/v1/amenities"), body(code.toLowerCase(), "06:00", "21:30")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(code.toUpperCase()))
                .andExpect(jsonPath("$.openTime").value("06:00"))
                .andExpect(jsonPath("$.closeTime").value("21:30"))
                .andExpect(jsonPath("$.slotCount").value(0)));
        send(post("/api/v1/amenities"), body(code, "06:00", "21:30")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("code"));
        send(post("/api/v1/amenities"), body(unique("x"), "21:00", "06:00")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("closeTime"));

        mvc.perform(get("/api/v1/amenities/{id}/config", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.slotMinutes").value(60))
                .andExpect(jsonPath("$.maxAdvanceDays").value(7))
                .andExpect(jsonPath("$.slots").isEmpty());
        mvc.perform(get("/api/v1/amenities/options").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(jsonPath("$[*].id", Matchers.contains((int) id)));
    }

    @Test
    void configIsSavedAsAWholeAndChecksOverlapsAndVersion() throws Exception {
        long id = id(send(post("/api/v1/amenities"), body(unique("gym"), "06:00", "22:00")));
        Map<String, Object> config = new HashMap<>();
        config.put("slotMinutes", 90);
        config.put("maxBookingsPerWeek", 3);
        config.put("maxAdvanceDays", 14);
        config.put("freeCancelHours", 4);
        config.put("slots", List.of(
                Map.of("dayOfWeek", 6, "startTime", "08:00", "endTime", "09:30"),
                Map.of("dayOfWeek", 1, "startTime", "06:00", "endTime", "07:30", "capacity", 10)));
        config.put("prices", List.of(Map.of("dayType", "WEEKEND", "startTime", "06:00", "endTime", "22:00",
                "price", 50000, "priceUnit", "PER_PERSON")));
        config.put("maintenances", List.of(Map.of("startDate", LocalDate.now().plusDays(3).toString(),
                "endDate", LocalDate.now().plusDays(4).toString(), "reason", "Bảo dưỡng máy")));
        config.put("version", 0);

        send(put("/api/v1/amenities/{id}/config", id), config).andExpect(status().isOk())
                .andExpect(jsonPath("$.slots[*].dayOfWeek", Matchers.contains(1, 6)))
                .andExpect(jsonPath("$.slots[0].startTime").value("06:00"))
                .andExpect(jsonPath("$.prices[0].priceUnit").value("PER_PERSON"))
                .andExpect(jsonPath("$.maintenances[0].reason").value("Bảo dưỡng máy"))
                .andExpect(jsonPath("$.version").value(1));
        // Lưu lại với version cũ → xung đột.
        send(put("/api/v1/amenities/{id}/config", id), config).andExpect(status().isConflict());

        config.put("version", 1);
        config.put("slots", List.of(
                Map.of("dayOfWeek", 2, "startTime", "08:00", "endTime", "09:30"),
                Map.of("dayOfWeek", 2, "startTime", "09:00", "endTime", "10:00")));
        send(put("/api/v1/amenities/{id}/config", id), config).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("slots"));
        mvc.perform(get("/api/v1/amenities/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.slotCount").value(2));
    }

    @Test
    void amenitiesOfOtherBuildingsAreHiddenAndDeleteWorksWithoutDependencies() throws Exception {
        Building other = createBuilding();
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long foreign = id(mvc.perform(post("/api/v1/amenities").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .header("X-Building-Id", other.getId().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body(unique("f"), "06:00", "21:00")))));
        mvc.perform(get("/api/v1/amenities/{id}/config", foreign).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());

        long mine = id(send(post("/api/v1/amenities"), body(unique("bbq"), "08:00", "20:00")));
        mvc.perform(delete("/api/v1/amenities/{id}", mine).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    // ---------------------------------------------------------------- helpers

    private static Map<String, Object> body(String code, String open, String close) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Tiện ích " + code);
        body.put("location", "Tầng 5");
        body.put("capacity", 20);
        body.put("openTime", open);
        body.put("closeTime", close);
        body.put("requiresApproval", true);
        body.put("status", "ACTIVE");
        body.put("images", List.of());
        return body;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private long id(ResultActions actions) throws Exception {
        return json(actions.andReturn()).get("id").asLong();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
