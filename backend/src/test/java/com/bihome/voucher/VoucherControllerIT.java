package com.bihome.voucher;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class VoucherControllerIT extends AbstractIT {

    @Autowired
    VoucherRepository voucherRepository;

    private Building tower;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
    }

    @Test
    void createValidatesRulesAndCodesAreUnique() throws Exception {
        String code = unique("HB");
        send(post("/api/v1/vouchers"), body(code.toLowerCase(), "PERCENT", 10, 50000, 0, 30))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(code.toUpperCase()))
                .andExpect(jsonPath("$.validity").value("VALID"))
                .andExpect(jsonPath("$.remaining").value(100))
                .andExpect(jsonPath("$.valueLocked").value(false));
        send(post("/api/v1/vouchers"), body(code, "PERCENT", 10, null, 0, 30))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errors[0].field").value("code"));
        send(post("/api/v1/vouchers"), body(unique("X"), "AMOUNT", 20000, 5000, 0, 30))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("maxDiscount"));
        send(post("/api/v1/vouchers"), body(unique("X"), "PERCENT", 10, null, 5, 1))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("validTo"));
    }

    @Test
    void validityFilterAndDateRangeOverlap() throws Exception {
        send(post("/api/v1/vouchers"), body(unique("OLD"), "AMOUNT", 20000, null, -40, -10));
        send(post("/api/v1/vouchers"), body(unique("NOW"), "PERCENT", 5, null, -1, 10));
        send(post("/api/v1/vouchers"), body(unique("NEW"), "PERCENT", 5, null, 20, 40));

        list(Map.of("validity", "EXPIRED")).andExpect(jsonPath("$.content[*].code", Matchers.contains(Matchers.startsWith("OLD"))));
        list(Map.of("validity", "UPCOMING")).andExpect(jsonPath("$.content[*].code", Matchers.contains(Matchers.startsWith("NEW"))));
        list(Map.of("validity", "VALID")).andExpect(jsonPath("$.content[*].code", Matchers.contains(Matchers.startsWith("NOW"))));
        list(Map.of("validFrom", LocalDate.now().plusDays(5).toString(), "validTo", LocalDate.now().plusDays(25).toString()))
                .andExpect(jsonPath("$.totalElements").value(2));
        list(Map.of("discountType", "AMOUNT")).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void usedVoucherKeepsItsValueAndCannotBeDeleted() throws Exception {
        JsonNode created = objectMapper.readTree(send(post("/api/v1/vouchers"), body(unique("U"), "PERCENT", 10, null, 0, 30))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
        long id = created.get("id").asLong();
        Voucher voucher = voucherRepository.findById(id).orElseThrow();
        voucher.setUsedCount(40);
        voucherRepository.saveAndFlush(voucher);
        long version = voucherRepository.findById(id).orElseThrow().getVersion();

        Map<String, Object> changed = body(created.get("code").asText(), "PERCENT", 20, null, 0, 30);
        changed.put("version", version);
        send(put("/api/v1/vouchers/{id}", id), changed).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("discountValue"));
        Map<String, Object> fewer = body(created.get("code").asText(), "PERCENT", 10, null, 0, 30);
        fewer.put("totalQuantity", 10);
        fewer.put("version", version);
        send(put("/api/v1/vouchers/{id}", id), fewer).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("totalQuantity"));
        Map<String, Object> renamed = body(created.get("code").asText(), "PERCENT", 10, null, 0, 60);
        renamed.put("name", "Giảm 10% (gia hạn)");
        renamed.put("version", version);
        send(put("/api/v1/vouchers/{id}", id), renamed).andExpect(status().isOk())
                .andExpect(jsonPath("$.valueLocked").value(true))
                .andExpect(jsonPath("$.remaining").value(60));

        mvc.perform(delete("/api/v1/vouchers/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());
        send(patch("/api/v1/vouchers/{id}/status", id), Map.of("status", "INACTIVE")).andExpect(jsonPath("$.status").value("INACTIVE"));
    }

    @Test
    void vouchersOfOtherBuildingsAreHidden() throws Exception {
        Building other = createBuilding();
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long foreign = objectMapper.readTree(mvc.perform(post("/api/v1/vouchers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .header("X-Building-Id", other.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body(unique("F"), "PERCENT", 10, null, 0, 30))))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(get("/api/v1/vouchers/{id}", foreign).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        list(Map.of()).andExpect(jsonPath("$.totalElements").value(0));
    }

    private static Map<String, Object> body(String code, String type, Number value, Number max, int fromDays, int toDays) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Voucher " + code);
        body.put("discountType", type);
        body.put("discountValue", value);
        body.put("maxDiscount", max);
        body.put("applyScope", "AMENITY");
        body.put("totalQuantity", 100);
        body.put("perApartmentLimit", 2);
        body.put("validFrom", LocalDate.now().plusDays(fromDays).toString());
        body.put("validTo", LocalDate.now().plusDays(toDays).toString());
        body.put("status", "ACTIVE");
        return body;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions list(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/vouchers")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString());
        params.forEach(request::param);
        return mvc.perform(request);
    }
}
