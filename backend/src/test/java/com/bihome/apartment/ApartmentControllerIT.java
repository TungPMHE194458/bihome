package com.bihome.apartment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ExcelWriter;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.Sheet;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ApartmentControllerIT extends AbstractIT {

    private Building tower;
    private Building garden;
    private String managerToken;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        garden = createBuilding();
        managerToken = login(createUser(unique("bqm"), Set.of(tower.getId(), garden.getId()), "BUILDING_MANAGER")
                .getUsername());
    }

    @Test
    void createUsesTheBuildingSelectedInTheHeader() throws Exception {
        send(post("/api/v1/apartments"), tower.getId(), body("a-12.05"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.buildingId").value(tower.getId()))
                .andExpect(jsonPath("$.buildingName").value(tower.getName()))
                .andExpect(jsonPath("$.code").value("A-12.05"))
                .andExpect(jsonPath("$.area").value(75.5))
                .andExpect(jsonPath("$.floorNo").value("12A"));
    }

    @Test
    void createWithoutAnyBuildingIsRejected() throws Exception {
        send(post("/api/v1/apartments"), null, body("A1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BUILDING_REQUIRED"));
    }

    @Test
    void codesAreUniquePerBuildingOnly() throws Exception {
        createApartment(tower.getId(), "A0101");

        send(post("/api/v1/apartments"), tower.getId(), body("a0101"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("code"));
        send(post("/api/v1/apartments"), garden.getId(), body("A0101")).andExpect(status().isCreated());
    }

    @Test
    void listFollowsTheHeaderSelectionOrShowsAllAccessibleBuildings() throws Exception {
        createApartment(tower.getId(), "T1");
        createApartment(tower.getId(), "T2");
        createApartment(garden.getId(), "G1");
        Building foreign = createBuilding();
        createApartment(foreign.getId(), "X1");

        list(tower.getId(), Map.of()).andExpect(jsonPath("$.totalElements").value(2));
        list(null, Map.of())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[*].code", Matchers.containsInAnyOrder("T1", "T2", "G1")));
        list(null, Map.of("buildingId", garden.getId().toString()))
                .andExpect(jsonPath("$.content[*].code", Matchers.contains("G1")));
        list(null, Map.of("buildingId", foreign.getId().toString())).andExpect(status().isNotFound());
    }

    @Test
    void columnFiltersAndSorting() throws Exception {
        Apartment a = createApartment(tower.getId(), "B0201");
        a.setFloorNo("2");
        a.setType(ApartmentEnums.ApartmentType.PENTHOUSE);
        a.setUsageStatus(ApartmentEnums.UsageStatus.VACANT);
        a.setBedrooms(3);
        apartmentRepository.saveAndFlush(a);
        createApartment(tower.getId(), "B0101");

        list(tower.getId(), Map.of("type", "PENTHOUSE")).andExpect(jsonPath("$.content[*].code", Matchers.contains("B0201")));
        list(tower.getId(), Map.of("usageStatus", "VACANT", "bedrooms", "3")).andExpect(jsonPath("$.totalElements").value(1));
        list(tower.getId(), Map.of("floorNo", "2")).andExpect(jsonPath("$.totalElements").value(1));
        list(tower.getId(), Map.of("sort", "code,desc"))
                .andExpect(jsonPath("$.content[*].code", Matchers.contains("B0201", "B0101")));
        list(null, Map.of("sort", "buildingName,asc")).andExpect(status().isOk());
    }

    @Test
    void apartmentsOfOtherBuildingsAreNotFound() throws Exception {
        Apartment foreign = createApartment(createBuilding().getId(), "F1");

        mvc.perform(get("/api/v1/apartments/{id}", foreign.getId()).header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
                .andExpect(status().isNotFound());
        send(post("/api/v1/apartments"), null, withBuilding(body("Z1"), foreign.getBuildingId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateKeepsTheBuildingAndChecksVersion() throws Exception {
        JsonNode created = json(send(post("/api/v1/apartments"), tower.getId(), body("U1"))
                .andExpect(status().isCreated()).andReturn());
        Map<String, Object> update = withBuilding(body("U1"), garden.getId());
        update.put("name", "Căn đổi tên");
        update.put("version", created.get("version").asLong());

        send(put("/api/v1/apartments/{id}", created.get("id").asLong()), null, update)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Căn đổi tên"))
                .andExpect(jsonPath("$.buildingId").value(tower.getId()));
        send(put("/api/v1/apartments/{id}", created.get("id").asLong()), null, update)
                .andExpect(status().isConflict());
    }

    @Test
    void buildingShowsApartmentCountAndCannotBeDeletedWhileItHasApartments() throws Exception {
        createApartment(tower.getId(), "C1");
        createApartment(tower.getId(), "C2");
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());

        mvc.perform(get("/api/v1/buildings/{id}", tower.getId()).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(jsonPath("$.apartmentCount").value(2));
        mvc.perform(get("/api/v1/buildings").header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
                        .param("sort", "apartmentCount,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(tower.getId()));
        mvc.perform(delete("/api/v1/buildings/{id}", tower.getId()).header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Tòa nhà còn 2 căn hộ, hãy chuyển sang Không hoạt động."));
    }

    @Test
    void exportReturnsAnXlsxOfTheFilteredApartments() throws Exception {
        createApartment(tower.getId(), "E1");
        createApartment(tower.getId(), "E2");
        createApartment(garden.getId(), "E3");

        MvcResult result = mvc.perform(get("/api/v1/apartments/export")
                        .header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, ExcelWriter.CONTENT_TYPE))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        Matchers.containsString("can-ho-" + tower.getCode().toLowerCase())))
                .andReturn();

        List<ExcelReader.ExcelRow> rows = ExcelReader.read(
                new ByteArrayInputStream(result.getResponse().getContentAsByteArray()), List.of("Mã căn hộ", "Tòa nhà"));
        assertThat(rows).extracting(r -> r.get("Mã căn hộ")).containsExactly("E1", "E2");
        assertThat(rows.getFirst().get("Loại")).isEqualTo("Căn hộ");
    }

    @Test
    void templateDownloads() throws Exception {
        mvc.perform(get("/api/v1/apartments/import-template").header(HttpHeaders.AUTHORIZATION, bearer(managerToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.containsString("mau-nhap-can-ho.xlsx")));
    }

    @Test
    void importStopsOnErrorWithoutSavingAnythingThenImportsValidRowsWhenAllowed() throws Exception {
        createApartment(tower.getId(), "EXIST");
        byte[] file = importFile(List.of(
                List.of("N1", "Căn N1", "3", "70.5", "Căn hộ", "Sở hữu"),
                List.of("N2", "Căn N2", "3", "abc", "Căn hộ", "Sở hữu"),
                List.of("N1", "Trùng", "3", "70", "Căn hộ", "Sở hữu"),
                List.of("exist", "Đã có", "3", "70", "Villa", "Cho thuê"),
                List.of("N3", "Căn N3", "4", "88", "PENTHOUSE", "RENT")));

        importExcel(tower.getId(), file, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(false))
                .andExpect(jsonPath("$.total").value(5))
                .andExpect(jsonPath("$.succeeded").value(0))
                .andExpect(jsonPath("$.failed").value(3))
                .andExpect(jsonPath("$.rows[1].rowNumber").value(3))
                .andExpect(jsonPath("$.rows[1].message").value("Diện tích (m²) không phải là số"))
                .andExpect(jsonPath("$.rows[2].message").value("Trùng mã căn hộ với dòng 2"))
                .andExpect(jsonPath("$.rows[3].message").value("Mã căn hộ đã tồn tại trong tòa nhà"));
        list(tower.getId(), Map.of()).andExpect(jsonPath("$.totalElements").value(1));

        importExcel(tower.getId(), file, false)
                .andExpect(jsonPath("$.imported").value(true))
                .andExpect(jsonPath("$.succeeded").value(2))
                .andExpect(jsonPath("$.rows[0].message").value("Đã nhập"));
        list(tower.getId(), Map.of())
                .andExpect(jsonPath("$.content[*].code", Matchers.containsInAnyOrder("EXIST", "N1", "N3")));
    }

    @Test
    void importRequiresASelectedBuildingAndAnXlsxFile() throws Exception {
        importExcel(null, importFile(List.of()), true)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BUILDING_REQUIRED"));
        mvc.perform(multipart("/api/v1/apartments/import")
                        .file(new MockMultipartFile("file", "x.xlsx", "application/octet-stream", "abc".getBytes()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_TYPE_NOT_ALLOWED"));
    }

    @Test
    void staffCanReadButNotWriteOrExport() throws Exception {
        String staffToken = login(createUser(unique("staff"), Set.of(tower.getId()), "STAFF").getUsername());

        mvc.perform(get("/api/v1/apartments").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/apartments/export").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/apartments").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body("S1"))))
                .andExpect(status().isForbidden());
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Long headerBuildingId, Object body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
        if (headerBuildingId != null) {
            request.header("X-Building-Id", headerBuildingId.toString());
        }
        return mvc.perform(request);
    }

    private ResultActions list(Long headerBuildingId, Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/apartments")
                .header(HttpHeaders.AUTHORIZATION, bearer(managerToken)).param("size", "50");
        params.forEach(request::param);
        if (headerBuildingId != null) {
            request.header("X-Building-Id", headerBuildingId.toString());
        }
        return mvc.perform(request);
    }

    private ResultActions importExcel(Long headerBuildingId, byte[] file, boolean stopOnError) throws Exception {
        MockHttpServletRequestBuilder request = multipart("/api/v1/apartments/import")
                .file(new MockMultipartFile("file", "can-ho.xlsx", ExcelWriter.CONTENT_TYPE, file))
                .param("stopOnError", String.valueOf(stopOnError))
                .header(HttpHeaders.AUTHORIZATION, bearer(managerToken));
        if (headerBuildingId != null) {
            request.header("X-Building-Id", headerBuildingId.toString());
        }
        return mvc.perform(request);
    }

    private static byte[] importFile(List<List<String>> rows) {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Căn hộ", ApartmentExcel.REQUIRED);
            rows.forEach(r -> excel.row(sheet, r));
            return excel.toBytes();
        }
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static Map<String, Object> withBuilding(Map<String, Object> body, Long buildingId) {
        body.put("buildingId", buildingId);
        return body;
    }

    private static Map<String, Object> body(String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Căn hộ " + code);
        body.put("floorNo", "12a");
        body.put("bedrooms", 2);
        body.put("rooms", 4);
        body.put("area", 75.5);
        body.put("type", "APARTMENT");
        body.put("ownershipType", "OWN");
        body.put("usageStatus", "OCCUPIED");
        body.put("status", ActiveStatus.ACTIVE.name());
        return body;
    }
}
