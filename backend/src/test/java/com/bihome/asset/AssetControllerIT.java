package com.bihome.asset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.entity.ActiveStatus;
import com.fasterxml.jackson.databind.JsonNode;
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

class AssetControllerIT extends AbstractIT {

    @Autowired
    AssetItemRepository itemRepository;

    @Autowired
    AssetItemService itemService;

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
    void categoryNamesAreUniquePerBuildingIgnoringCase() throws Exception {
        createCategory("Xe máy").andExpect(status().isCreated())
                .andExpect(jsonPath("$.buildingId").value(tower.getId()))
                .andExpect(jsonPath("$.unit").value("chiếc"));

        createCategory("XE MÁY")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("name"));
    }

    @Test
    void categoryWithItemsCannotBeDeletedButCanBeDeactivated() throws Exception {
        long categoryId = id(createCategory("Ô tô"));
        createItem(itemBody(a1.getId(), categoryId, "30A-111.11")).andExpect(status().isCreated());

        mvc.perform(delete("/api/v1/asset-categories/{id}", categoryId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Danh mục đang có 1 hạng mục, hãy chuyển sang Ngừng hoạt động."));
        send(patch("/api/v1/asset-categories/{id}/status", categoryId), Map.of("status", "INACTIVE"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/asset-categories/options").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(jsonPath("$[*].id", Matchers.not(Matchers.hasItem((int) categoryId))));
    }

    @Test
    void itemNormalizesPlateAndDefaultsUnitFromCategory() throws Exception {
        long categoryId = id(createCategory("Xe máy"));
        Map<String, Object> body = itemBody(a1.getId(), categoryId, "  29b1   678.90 ");
        body.remove("unit");

        createItem(body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.plateNumber").value("29B1 678.90"))
                .andExpect(jsonPath("$.unit").value("chiếc"))
                .andExpect(jsonPath("$.apartmentName").value(a1.getName()))
                .andExpect(jsonPath("$.categoryName").value("Xe máy"))
                .andExpect(jsonPath("$.buildingName").value(tower.getName()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void activePlatesAreUniqueInTheBuildingButMayBeReusedAfterExit() throws Exception {
        long categoryId = id(createCategory("Ô tô"));
        long first = id(createItem(itemBody(a1.getId(), categoryId, "30A-123.45")).andExpect(status().isCreated()));

        createItem(itemBody(a2.getId(), categoryId, "30a-123.45"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("plateNumber"));

        send(patch("/api/v1/asset-items/{id}/status", first), Map.of("status", "INACTIVE")).andExpect(status().isOk());
        createItem(itemBody(a2.getId(), categoryId, "30A-123.45")).andExpect(status().isCreated());
        // Kích hoạt lại xe cũ sẽ trùng biển số với xe đang hoạt động.
        send(patch("/api/v1/asset-items/{id}/status", first), Map.of("status", "ACTIVE")).andExpect(status().isConflict());
    }

    @Test
    void exitDateInThePastDeactivatesAndTheDailyJobCatchesUp() throws Exception {
        long categoryId = id(createCategory("Xe đạp"));
        Map<String, Object> body = itemBody(a1.getId(), categoryId, null);
        body.put("exitDate", LocalDate.now().toString());
        createItem(body).andExpect(jsonPath("$.status").value("INACTIVE"));

        long active = id(createItem(itemBody(a1.getId(), categoryId, null)));
        AssetItem item = itemRepository.findById(active).orElseThrow();
        item.setExitDate(LocalDate.now().minusDays(1));
        itemRepository.saveAndFlush(item);

        assertThat(itemService.deactivateExited()).isGreaterThanOrEqualTo(1);
        assertThat(itemRepository.findById(active).orElseThrow().getStatus()).isEqualTo(ActiveStatus.INACTIVE);
    }

    @Test
    void itemListFiltersByApartmentPlateCategoryAndEntryDate() throws Exception {
        long car = id(createCategory("Ô tô"));
        long bike = id(createCategory("Xe máy"));
        createItem(itemBody(a1.getId(), car, "30A-000.01"));
        createItem(itemBody(a1.getId(), bike, "29B1-000.02"));
        Map<String, Object> old = itemBody(a2.getId(), bike, "29B1-000.03");
        old.put("entryDate", "2024-01-01");
        createItem(old);

        list(Map.of("apartmentId", a1.getId().toString())).andExpect(jsonPath("$.totalElements").value(2));
        list(Map.of("plateNumber", "000.0")).andExpect(jsonPath("$.totalElements").value(3));
        list(Map.of("categoryId", String.valueOf(bike))).andExpect(jsonPath("$.totalElements").value(2));
        list(Map.of("entryTo", "2024-12-31")).andExpect(jsonPath("$.content[*].plateNumber", Matchers.contains("29B1-000.03")));
        list(Map.of("apartment", a2.getCode())).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void itemsAndCategoriesOfOtherBuildingsAreHidden() throws Exception {
        Building other = createBuilding();
        Apartment foreign = createApartment(other.getId(), "F1");
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long foreignCategory = id(mvc.perform(post("/api/v1/asset-categories")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("buildingId", other.getId(), "name", "Ô tô",
                        "unit", "chiếc", "status", "ACTIVE")))));

        mvc.perform(get("/api/v1/asset-categories/{id}", foreignCategory).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        createItem(itemBody(foreign.getId(), foreignCategory, null)).andExpect(status().isNotFound());

        long mine = id(createCategory("Ô tô"));
        createItem(itemBody(a1.getId(), foreignCategory, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("categoryId"));
        createItem(itemBody(a1.getId(), mine, null)).andExpect(status().isCreated());
    }

    @Test
    void updateCanMoveTheItemToAnotherApartmentOfTheSameBuildingOnly() throws Exception {
        long categoryId = id(createCategory("Ô tô"));
        JsonNode created = json(createItem(itemBody(a1.getId(), categoryId, "51K-999.99")).andReturn());
        Map<String, Object> body = itemBody(a2.getId(), categoryId, "51K-999.99");
        body.put("version", created.get("version").asLong());

        send(put("/api/v1/asset-items/{id}", created.get("id").asLong()), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apartmentId").value(a2.getId()));

        Apartment elsewhere = createApartment(createBuilding().getId(), "E1");
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        body.put("apartmentId", elsewhere.getId());
        body.put("version", created.get("version").asLong() + 1);
        mvc.perform(put("/api/v1/asset-items/{id}", created.get("id").asLong())
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("apartmentId"));
    }

    @Test
    void apartmentWithItemsCannotBeDeleted() throws Exception {
        long categoryId = id(createCategory("Ô tô"));
        createItem(itemBody(a1.getId(), categoryId, null));

        mvc.perform(delete("/api/v1/apartments/{id}", a1.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Căn hộ còn 1 hạng mục, hãy chuyển sang Không hoạt động."));
    }

    @Test
    void apartmentOptionsSearchWithinScope() throws Exception {
        mvc.perform(get("/api/v1/apartments/options").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .param("keyword", "a2").param("buildingId", tower.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", Matchers.contains("A2")))
                .andExpect(jsonPath("$[0].buildingName").value(tower.getName()));
    }

    private ResultActions createCategory(String name) throws Exception {
        return send(post("/api/v1/asset-categories"), Map.of("name", name, "unit", "chiếc", "status", "ACTIVE"));
    }

    private ResultActions createItem(Map<String, Object> body) throws Exception {
        return send(post("/api/v1/asset-items"), body);
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions list(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/asset-items")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString());
        params.forEach(request::param);
        return mvc.perform(request);
    }

    private long id(ResultActions actions) throws Exception {
        return json(actions.andReturn()).get("id").asLong();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static Map<String, Object> itemBody(Long apartmentId, long categoryId, String plate) {
        Map<String, Object> body = new HashMap<>();
        body.put("apartmentId", apartmentId);
        body.put("categoryId", categoryId);
        body.put("name", "Xe của " + apartmentId);
        body.put("plateNumber", plate);
        body.put("unit", "chiếc");
        body.put("entryDate", LocalDate.now().minusDays(10).toString());
        body.put("status", "ACTIVE");
        return body;
    }
}
