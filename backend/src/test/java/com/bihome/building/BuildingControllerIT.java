package com.bihome.building;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.user.AppUser;
import com.fasterxml.jackson.databind.JsonNode;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class BuildingControllerIT extends AbstractIT {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    private AppUser admin;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        admin = createUser(unique("admin"), "SUPER_ADMIN");
        adminToken = login(admin.getUsername());
    }

    @Test
    void createNormalizesCodeAndReturnsFullAddress() throws Exception {
        String code = unique("sky");

        send(adminToken, post("/api/v1/buildings"), body(code))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(code.toUpperCase()))
                .andExpect(jsonPath("$.fullAddress").value("Số 1 Trung Kính, Phường Cầu Giấy, Hà Nội"))
                .andExpect(jsonPath("$.type").value("BUILDING"))
                .andExpect(jsonPath("$.apartmentCount").value(0))
                .andExpect(jsonPath("$.createdBy").value(admin.getUsername()))
                .andExpect(jsonPath("$.version").value(0));
    }

    @Test
    void duplicateCodeReturns409OnTheCodeField() throws Exception {
        Building existing = createBuilding();

        send(adminToken, post("/api/v1/buildings"), body(existing.getCode().toLowerCase()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("code"))
                .andExpect(jsonPath("$.errors[0].message").value("Mã tòa nhà đã tồn tại."));
    }

    @Test
    void invalidInputReturnsVietnameseFieldErrors() throws Exception {
        Map<String, Object> body = body("có dấu cách");
        body.put("name", "");
        body.put("floorsAbove", -1);
        body.put("managementEmail", "khong-hop-le");

        send(adminToken, post("/api/v1/buildings"), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field",
                        Matchers.containsInAnyOrder("code", "name", "floorsAbove", "managementEmail")))
                .andExpect(jsonPath("$.errors[?(@.field=='floorsAbove')].message").value("Số tầng nổi không được âm"));
    }

    @Test
    void listFiltersByColumnsAndIgnoresTheSelectedBuildingHeader() throws Exception {
        String marker = unique("loc");
        Building a = createBuilding();
        a.setName("Alpha " + marker);
        a.setType(BuildingType.COMPOUND);
        buildingRepository.saveAndFlush(a);
        Building b = createBuilding();
        b.setName("Beta " + marker);
        b.setStatus(ActiveStatus.INACTIVE);
        buildingRepository.saveAndFlush(b);
        Building other = createBuilding();

        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .header("X-Building-Id", other.getId().toString())
                        .param("name", marker.toUpperCase()).param("sort", "name,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].name").value("Alpha " + marker))
                .andExpect(jsonPath("$.content[1].status").value("INACTIVE"));

        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("name", marker).param("type", "COMPOUND"))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("name", marker).param("status", "INACTIVE"))
                .andExpect(jsonPath("$.content[0].name").value("Beta " + marker));
        String today = LocalDate.now().toString();
        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("name", marker).param("createdFrom", today).param("createdTo", today))
                .andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("name", marker).param("createdTo", LocalDate.now().minusDays(2).toString()))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void nonAdminOnlySeesAssignedBuildingsAndGets404ForOthers() throws Exception {
        Building mine = createBuilding();
        Building notMine = createBuilding();
        String token = login(createUser(unique("bqm"), Set.of(mine.getId()), "BUILDING_MANAGER").getUsername());

        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(token)).param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(mine.getId()));
        mvc.perform(get("/api/v1/buildings/{id}", notMine.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        send(token, patch("/api/v1/buildings/{id}/status", notMine.getId()), Map.of("status", "INACTIVE"))
                .andExpect(status().isNotFound());
    }

    @Test
    void managerWhoCreatesABuildingIsAssignedToIt() throws Exception {
        AppUser manager = createUser(unique("bqm"), "BUILDING_MANAGER");
        String token = login(manager.getUsername());

        long id = json(send(token, post("/api/v1/buildings"), body(unique("new")))
                .andExpect(status().isCreated()).andReturn()).get("id").asLong();

        mvc.perform(get("/api/v1/buildings/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.buildingIds", Matchers.contains((int) id)));
    }

    @Test
    void optionsShowActiveAssignedBuildingsOrEverythingForAdmin() throws Exception {
        Building active = createBuilding();
        Building inactive = createBuilding(unique("OFF").toUpperCase(), ActiveStatus.INACTIVE);
        createBuilding();
        String staffToken = login(createUser(unique("staff"), Set.of(active.getId(), inactive.getId()), "STAFF")
                .getUsername());

        mvc.perform(get("/api/v1/buildings/options").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(active.getId()))
                .andExpect(jsonPath("$[0].address").value("Số 1 Trung Kính, Phường Cầu Giấy, Hà Nội"));

        MvcResult all = mvc.perform(get("/api/v1/buildings/options").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk()).andReturn();
        List<Long> ids = json(all).findValues("id").stream().map(JsonNode::asLong).toList();
        assertThat(ids).contains(active.getId(), inactive.getId());
    }

    @Test
    void imagesKeepOrderAndExactlyOneCover() throws Exception {
        long first = upload(adminToken, "BUILDING_IMAGE");
        long second = upload(adminToken, "BUILDING_IMAGE");
        Map<String, Object> body = body(unique("img"));
        body.put("images", List.of(Map.of("fileId", first, "cover", false), Map.of("fileId", second, "cover", true)));

        MvcResult created = send(adminToken, post("/api/v1/buildings"), body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.images[0].fileId").value(first))
                .andExpect(jsonPath("$.images[1].cover").value(true))
                .andExpect(jsonPath("$.coverImageUrl").value("/api/v1/files/" + second))
                .andReturn();

        // Đổi thứ tự và bỏ chọn đại diện → ảnh đầu tiên thành ảnh đại diện.
        JsonNode json = json(created);
        body.put("images", List.of(Map.of("fileId", second, "cover", false), Map.of("fileId", first, "cover", false)));
        body.put("version", json.get("version").asLong());
        send(adminToken, put("/api/v1/buildings/{id}", json.get("id").asLong()), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images[0].fileId").value(second))
                .andExpect(jsonPath("$.images[0].cover").value(true))
                .andExpect(jsonPath("$.images[1].cover").value(false));
    }

    @Test
    void imagesMustBeOwnBuildingImageUploadsWithASingleCover() throws Exception {
        long document = upload(adminToken, "AVATAR");
        String otherToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long someoneElses = upload(otherToken, "BUILDING_IMAGE");
        long mine = upload(adminToken, "BUILDING_IMAGE");
        long mine2 = upload(adminToken, "BUILDING_IMAGE");

        for (Object images : List.of(
                List.of(Map.of("fileId", document, "cover", true)),
                List.of(Map.of("fileId", someoneElses, "cover", true)),
                List.of(Map.of("fileId", mine, "cover", true), Map.of("fileId", mine2, "cover", true)))) {
            Map<String, Object> body = body(unique("bad"));
            body.put("images", images);
            send(adminToken, post("/api/v1/buildings"), body)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("images"));
        }
    }

    @Test
    void updateWithStaleVersionReturns409() throws Exception {
        JsonNode created = json(send(adminToken, post("/api/v1/buildings"), body(unique("ver")))
                .andExpect(status().isCreated()).andReturn());
        long id = created.get("id").asLong();
        Map<String, Object> body = body(created.get("code").asText());
        body.put("name", "Tên mới");
        body.put("version", created.get("version").asLong());

        send(adminToken, put("/api/v1/buildings/{id}", id), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tên mới"))
                .andExpect(jsonPath("$.version").value(1));
        send(adminToken, put("/api/v1/buildings/{id}", id), body)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
    }

    @Test
    void changeStatusAndDeleteRemovesUserAssignments() throws Exception {
        Building building = createBuilding();
        AppUser staff = createUser(unique("staff"), Set.of(building.getId()), "STAFF");

        send(adminToken, patch("/api/v1/buildings/{id}/status", building.getId()), Map.of("status", "INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        mvc.perform(delete("/api/v1/buildings/{id}", building.getId()).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isNoContent());
        assertThat(buildingRepository.findById(building.getId())).isEmpty();
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(login(staff.getUsername()))))
                .andExpect(jsonPath("$.buildingIds").isEmpty());
    }

    @Test
    void permissionsAreEnforcedPerAction() throws Exception {
        Building building = createBuilding();
        String staffToken = login(createUser(unique("staff"), Set.of(building.getId()), "STAFF").getUsername());

        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(status().isOk());
        send(staffToken, post("/api/v1/buildings"), body(unique("x"))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/buildings/{id}", building.getId()).header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(status().isForbidden());
    }

    private ResultActions send(String token, MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private long upload(String token, String purpose) throws Exception {
        String body = mvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", "anh.png", "image/png", PNG))
                        .param("purpose", purpose)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asLong();
    }

    private static Map<String, Object> body(String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "BiHome Sky Tower");
        body.put("province", "Hà Nội");
        body.put("ward", "Phường Cầu Giấy");
        body.put("addressDetail", "Số 1 Trung Kính");
        body.put("type", "BUILDING");
        body.put("floorsAbove", 30);
        body.put("floorsBelow", 2);
        body.put("hotline", "1900 1234");
        body.put("managementEmail", "BQL@BiHome.vn");
        body.put("status", "ACTIVE");
        return body;
    }
}
