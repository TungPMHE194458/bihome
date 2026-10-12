package com.bihome.dashboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class DashboardControllerIT extends AbstractIT {

    @Test
    void countsAreScopedToTheSelectedBuilding() throws Exception {
        Building tower = createBuilding();
        createApartment(tower.getId(), "A1");
        createApartment(tower.getId(), "A2");
        Building other = createBuilding();
        createApartment(other.getId(), "B1");
        String token = login(createUser(unique("bqm"), Set.of(tower.getId(), other.getId()), "BUILDING_MANAGER").getUsername());

        String category = mvc.perform(post("/api/v1/ticket-categories").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", unique("Nước "), "responseSlaHours", 1,
                                "resolutionSlaHours", 8, "status", "ACTIVE"))))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode cat = objectMapper.readTree(category);
        Map<String, Object> ticket = new HashMap<>();
        ticket.put("title", "Rò nước");
        ticket.put("categoryId", cat.get("id").asLong());
        ticket.put("channel", "HOTLINE");
        ticket.put("priority", "HIGH");
        ticket.put("fileIds", List.of());
        mvc.perform(post("/api/v1/tickets").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(ticket)))
                .andExpect(status().isCreated());

        int month = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh")).getMonthValue();
        mvc.perform(get("/api/v1/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.system").doesNotExist())
                .andExpect(jsonPath("$.buildingCount").value(1))
                .andExpect(jsonPath("$.apartmentCount").value(2))
                .andExpect(jsonPath("$.openTickets").value(1))
                .andExpect(jsonPath("$.ticketsCreatedInMonth").value(1))
                .andExpect(jsonPath("$.ticketsByMonth[" + (month - 1) + "].created").value(1))
                .andExpect(jsonPath("$.ticketsByCategory[0].name").value(cat.get("name").asText()))
                .andExpect(jsonPath("$.openTicketsByStatus[0].key").value("NEW"))
                .andExpect(jsonPath("$.recentTickets[0].title").value("Rò nước"))
                .andExpect(jsonPath("$.amenityBookingsToday").value(0))
                .andExpect(jsonPath("$.bookingsByWeek.length()").value(8));
        mvc.perform(get("/api/v1/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.buildingCount").value(2))
                .andExpect(jsonPath("$.apartmentCount").value(3));
        mvc.perform(get("/api/v1/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("month", "2020-01"))
                .andExpect(jsonPath("$.month").value("2020-01"))
                .andExpect(jsonPath("$.ticketsCreatedInMonth").value(0));
    }
}
