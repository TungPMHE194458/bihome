package com.bihome.accesscard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.resident.ApartmentResident;
import com.bihome.resident.ApartmentResidentRepository;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class AccessCardControllerIT extends AbstractIT {

    @Autowired
    AccessCardRepository cardRepository;

    @Autowired
    AccessCardService cardService;

    @Autowired
    ApartmentResidentRepository linkRepository;

    private Building tower;
    private Apartment a1;
    private Apartment a2;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        a2 = createApartment(tower.getId(), "A2");
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
    }

    @Test
    void stockCardIsIssuedThenLockedAndHistoryIsKept() throws Exception {
        long residentId = createResident("Nguyễn Văn An", "0912345678", a1.getId());
        String cardNo = unique("C").toUpperCase();
        JsonNode card = json(create(cardBody(cardNo.toLowerCase(), "DOOR", null, null, null)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.cardNo").value(cardNo))
                .andExpect(jsonPath("$.status").value("IN_STOCK"))
                .andExpect(jsonPath("$.allowedStatuses", Matchers.contains("IN_USE", "LOST")))
                .andReturn());
        long id = card.get("id").asLong();
        create(cardBody(cardNo, "DOOR", null, null, null)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("cardNo"));

        send(post("/api/v1/access-cards/{id}/status", id), Map.of("status", "IN_USE", "version", version(id)))
                .andExpect(status().isUnprocessableEntity());
        send(post("/api/v1/access-cards/{id}/issue", id),
                Map.of("apartmentId", a1.getId(), "residentId", residentId, "version", version(id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_USE"))
                .andExpect(jsonPath("$.residentName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.issuedDate").value(LocalDate.now().toString()));
        send(post("/api/v1/access-cards/{id}/status", id), Map.of("status", "LOCKED", "note", "Nợ phí", "version", version(id)))
                .andExpect(jsonPath("$.status").value("LOCKED"));

        mvc.perform(get("/api/v1/access-cards/{id}/history", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].action", Matchers.contains("STATUS_CHANGE", "ISSUED", "CREATED")))
                .andExpect(jsonPath("$[0].note").value("Nợ phí"))
                .andExpect(jsonPath("$[1].apartmentLabel").value("A1 – Căn A1"))
                .andExpect(jsonPath("$[1].residentName").value("Nguyễn Văn An"));
        list(Map.of("resident", "văn an")).andExpect(jsonPath("$.totalElements").value(1));
        list(Map.of("status", "IN_STOCK")).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void parkingCardLinksOneVehicleShownOnTheAssetItem() throws Exception {
        long item = createVehicle(a1.getId(), "30A-111.22");
        String cardNo = unique("P").toUpperCase();
        long cardId = id(create(cardBody(cardNo, "PARKING", a1.getId(), null, item)).andExpect(status().isCreated()));

        create(cardBody(unique("E"), "ELEVATOR", a1.getId(), null, item)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("assetItemId"));
        create(cardBody(unique("P"), "MULTI", a1.getId(), null, item)).andExpect(status().isConflict());
        create(cardBody(unique("P"), "PARKING", a2.getId(), null, item)).andExpect(status().isBadRequest());

        mvc.perform(get("/api/v1/asset-items").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("accessCardNo", cardNo.substring(1, 6)))
                .andExpect(jsonPath("$.content[0].accessCardNo").value(cardNo));
        mvc.perform(delete("/api/v1/asset-items/{id}", item).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/apartments/{id}", a1.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());

        send(post("/api/v1/access-cards/{id}/status", cardId), Map.of("status", "REVOKED", "version", version(cardId)))
                .andExpect(jsonPath("$.assetItemId").doesNotExist())
                .andExpect(jsonPath("$.apartmentId").doesNotExist());
        // Xe đã được giải phóng → thẻ mới liên kết được.
        create(cardBody(unique("P"), "PARKING", a1.getId(), null, item)).andExpect(status().isCreated());
    }

    @Test
    void movingOutRevokesTheResidentsCardsAtThatApartment() throws Exception {
        long residentId = createResident("Trần Thị Bình", "0912345679", a1.getId());
        long card = id(create(cardBody(unique("C"), "MULTI", a1.getId(), residentId, null)));

        send(post("/api/v1/residents/{id}/move-out", residentId), Map.of("moveOutDate", LocalDate.now().toString()))
                .andExpect(status().isOk());

        AccessCard revoked = cardRepository.findById(card).orElseThrow();
        assertThat(revoked.getStatus()).isEqualTo(CardStatus.REVOKED);
        assertThat(revoked.getResidentId()).isNull();
        mvc.perform(get("/api/v1/access-cards/{id}/history", card).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[0].note").value("Thu hồi khi cư dân chuyển đi"))
                .andExpect(jsonPath("$[0].residentName").value("Trần Thị Bình"));
    }

    @Test
    void dailySweepRevokesCardsOfResidentsWhoMovedOutByDate() throws Exception {
        long residentId = createResident("Lê Văn Cường", "0912345670", a1.getId());
        long card = id(create(cardBody(unique("C"), "DOOR", a1.getId(), residentId, null)));
        ApartmentResident link = linkRepository.findByApartment(a1.getId(), ResidenceStatus.MOVED_OUT).getFirst();
        link.setMoveOutDate(LocalDate.now());
        link.setResidenceStatus(ResidenceStatus.MOVED_OUT);
        linkRepository.saveAndFlush(link);

        assertThat(cardService.revokeOrphaned()).isGreaterThanOrEqualTo(1);
        assertThat(cardRepository.findById(card).orElseThrow().getStatus()).isEqualTo(CardStatus.REVOKED);
    }

    @Test
    void lostCardKeepsTheResidentWhichBlocksDeletingThem() throws Exception {
        long residentId = createResident("Phạm Thu Hà", "0912345671", a1.getId());
        long card = id(create(cardBody(unique("C"), "DOOR", a1.getId(), residentId, null)));
        send(post("/api/v1/access-cards/{id}/status", card), Map.of("status", "LOST", "version", version(card)))
                .andExpect(jsonPath("$.residentId").value(residentId))
                .andExpect(jsonPath("$.allowedStatuses", Matchers.contains("IN_STOCK")));
        send(post("/api/v1/residents/{id}/move-out", residentId), Map.of("moveOutDate", LocalDate.now().toString()));

        mvc.perform(delete("/api/v1/residents/{id}", residentId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", Matchers.containsString("thẻ từ")));
        send(post("/api/v1/access-cards/{id}/status", card), Map.of("status", "IN_STOCK", "note", "Tìm lại được",
                "version", version(card)))
                .andExpect(jsonPath("$.residentId").doesNotExist());
        mvc.perform(delete("/api/v1/residents/{id}", residentId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    @Test
    void residentMustLiveInTheApartmentAndOtherBuildingsAreHidden() throws Exception {
        long residentId = createResident("Đỗ Huy", "0912345672", a2.getId());
        create(cardBody(unique("C"), "DOOR", a1.getId(), residentId, null)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("residentId"));

        Apartment foreign = createApartment(createBuilding().getId(), "F1");
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long foreignCard = id(mvc.perform(post("/api/v1/access-cards").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(cardBody(unique("F"), "DOOR", foreign.getId(), null, null)))));
        mvc.perform(get("/api/v1/access-cards/{id}", foreignCard).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        create(cardBody(unique("C"), "DOOR", foreign.getId(), null, null)).andExpect(status().isNotFound());
    }

    @Test
    void onlyNeverIssuedStockCardsCanBeDeleted() throws Exception {
        long stock = id(create(cardBody(unique("C"), "DOOR", null, null, null)));
        long issued = id(create(cardBody(unique("C"), "DOOR", a1.getId(), null, null)));
        mvc.perform(delete("/api/v1/access-cards/{id}", issued).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/access-cards/{id}", stock).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    // ---------------------------------------------------------------- helpers

    private long createResident(String name, String phone, long apartmentId) throws Exception {
        Map<String, Object> link = new HashMap<>();
        link.put("apartmentId", apartmentId);
        link.put("role", "OWNER");
        link.put("householdHead", false);
        link.put("moveInDate", LocalDate.now().minusYears(1).toString());
        link.put("tempResidenceRegistered", false);
        return id(send(post("/api/v1/residents"), Map.of("fullName", name, "phone", phone, "apartment", link))
                .andExpect(status().isCreated()));
    }

    private long createVehicle(long apartmentId, String plate) throws Exception {
        long category = id(send(post("/api/v1/asset-categories"),
                Map.of("name", unique("Ô tô "), "unit", "chiếc", "status", "ACTIVE")));
        Map<String, Object> body = new HashMap<>();
        body.put("apartmentId", apartmentId);
        body.put("categoryId", category);
        body.put("name", "Xe " + plate);
        body.put("plateNumber", plate);
        body.put("entryDate", LocalDate.now().minusDays(1).toString());
        body.put("status", "ACTIVE");
        return id(send(post("/api/v1/asset-items"), body).andExpect(status().isCreated()));
    }

    private static Map<String, Object> cardBody(String cardNo, String type, Long apartmentId, Long residentId, Long itemId) {
        Map<String, Object> body = new HashMap<>();
        body.put("cardNo", cardNo);
        body.put("cardType", type);
        body.put("apartmentId", apartmentId);
        body.put("residentId", residentId);
        body.put("assetItemId", itemId);
        body.put("issueFee", 50000);
        return body;
    }

    private long version(long id) {
        return cardRepository.findById(id).orElseThrow().getVersion();
    }

    private ResultActions create(Map<String, Object> body) throws Exception {
        return send(post("/api/v1/access-cards"), body);
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions list(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/access-cards")
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
