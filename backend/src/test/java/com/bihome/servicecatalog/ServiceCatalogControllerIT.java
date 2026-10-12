package com.bihome.servicecatalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.bihome.voucher.Voucher;
import com.bihome.voucher.VoucherRepository;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ServiceCatalogControllerIT extends AbstractIT {

    @Autowired
    VoucherRepository voucherRepository;

    private Building tower;
    private String token;
    private long typeId;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        typeId = id(send(post("/api/v1/service-types"), Map.of("name", unique("Giặt "), "status", "ACTIVE")));
    }

    @Test
    void defaultTypesAreSeededAndNamesAreUnique() throws Exception {
        mvc.perform(get("/api/v1/service-types/options").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].name", Matchers.hasItems("Vệ sinh", "Sửa chữa", "Giặt là", "Chuyển nhà")));
        send(post("/api/v1/service-types"), Map.of("name", "VỆ SINH", "status", "ACTIVE")).andExpect(status().isConflict());
    }

    @Test
    void servicesGetGeneratedCodesAndBlockDeletingTheirType() throws Exception {
        send(post("/api/v1/services"), serviceBody("")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("DV0001"))
                .andExpect(jsonPath("$.serviceTypeId").value(typeId))
                .andExpect(jsonPath("$.unit").value("lần"));
        send(post("/api/v1/services"), serviceBody(null)).andExpect(jsonPath("$.code").value("DV0002"));
        send(post("/api/v1/services"), serviceBody("dv0001")).andExpect(status().isConflict());

        mvc.perform(delete("/api/v1/service-types/{id}", typeId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Loại dịch vụ đang có 2 dịch vụ, hãy chuyển sang Ngừng hoạt động."));
        mvc.perform(get("/api/v1/services").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("serviceTypeId", String.valueOf(typeId)))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void voucherTargetsMustMatchScopeAndBuildingAndLockOnceUsed() throws Exception {
        long service = id(send(post("/api/v1/services"), serviceBody(null)));
        long amenity = id(send(post("/api/v1/amenities"), amenityBody(unique("POOL"))));
        Building other = createBuilding();
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long foreignAmenity = id(mvc.perform(post("/api/v1/amenities").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .header("X-Building-Id", other.getId().toString()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(amenityBody(unique("F"))))));

        send(post("/api/v1/vouchers"), voucher("AMENITY", List.of(), List.of(service))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("serviceIds"));
        send(post("/api/v1/vouchers"), voucher("AMENITY", List.of(foreignAmenity), List.of())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("amenityIds"));
        JsonNode created = json(send(post("/api/v1/vouchers"), voucher("ALL", List.of(amenity), List.of(service)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amenities[0].id").value(amenity))
                .andExpect(jsonPath("$.services[0].id").value(service))
                .andReturn());

        mvc.perform(delete("/api/v1/amenities/{id}", amenity).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/services/{id}", service).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());

        long voucherId = created.get("id").asLong();
        Voucher v = voucherRepository.findById(voucherId).orElseThrow();
        v.setUsedCount(1);
        voucherRepository.saveAndFlush(v);
        Map<String, Object> dropTarget = voucher("ALL", List.of(), List.of(service));
        dropTarget.put("code", created.get("code").asText());
        dropTarget.put("version", voucherRepository.findById(voucherId).orElseThrow().getVersion());
        send(put("/api/v1/vouchers/{id}", voucherId), dropTarget).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("discountValue"));
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> serviceBody(String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Giặt sofa");
        body.put("serviceTypeId", typeId);
        body.put("unitPrice", 250000);
        body.put("unit", "lần");
        body.put("status", "ACTIVE");
        body.put("images", List.of());
        return body;
    }

    private static Map<String, Object> amenityBody(String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Hồ bơi");
        body.put("capacity", 30);
        body.put("openTime", "06:00");
        body.put("closeTime", "21:00");
        body.put("requiresApproval", false);
        body.put("status", "ACTIVE");
        body.put("images", List.of());
        return body;
    }

    private static Map<String, Object> voucher(String scope, List<Long> amenities, List<Long> services) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", unique("V"));
        body.put("name", "Voucher thử");
        body.put("discountType", "PERCENT");
        body.put("discountValue", 10);
        body.put("applyScope", scope);
        body.put("amenityIds", amenities);
        body.put("serviceIds", services);
        body.put("validFrom", LocalDate.now().toString());
        body.put("validTo", LocalDate.now().plusDays(30).toString());
        body.put("status", "ACTIVE");
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
