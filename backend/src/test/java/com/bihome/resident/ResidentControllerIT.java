package com.bihome.resident;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.Sheet;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ResidentControllerIT extends AbstractIT {

    private static final List<String> IMPORT_HEADERS = List.of("Mã cư dân", "Họ và tên *", "Số điện thoại *",
            "Loại giấy tờ", "Số giấy tờ", "Mã căn hộ *", "Vai trò tại căn hộ *", "Chủ hộ chính", "Ngày chuyển đến *");

    @Autowired
    ApartmentResidentRepository linkRepository;

    @Autowired
    ResidentService residentService;

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
    void createGeneratesCodeMasksIdInListAndFeedsApartmentAndBuildingStats() throws Exception {
        Map<String, Object> body = residentBody("Nguyễn Văn An", "+84912345678", a1.getId(), "OWNER", true);
        body.put("idType", "CCCD");
        body.put("idNumber", "001 085 012 345");
        JsonNode created = json(create(body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("CD000001"))
                .andExpect(jsonPath("$.phone").value("0912345678"))
                .andExpect(jsonPath("$.idNumber").value("001085012345"))
                .andExpect(jsonPath("$.nationality").value("Việt Nam"))
                .andExpect(jsonPath("$.appAccountStatus").value("NONE"))
                .andExpect(jsonPath("$.residenceStatus").value("LIVING"))
                .andExpect(jsonPath("$.buildingName").value(tower.getName()))
                .andExpect(jsonPath("$.apartments[0].apartmentCode").value("A1"))
                .andExpect(jsonPath("$.apartments[0].householdHead").value(true))
                .andReturn());
        create(residentBody("Trần Thị Bình", "0987654321", a1.getId(), "FAMILY", false))
                .andExpect(jsonPath("$.code").value("CD000002"));

        list(Map.of("sort", "fullName,asc"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].idNumberMasked").value("0010*****345"))
                .andExpect(jsonPath("$.content[0].idNumber").doesNotExist())
                .andExpect(jsonPath("$.content[0].apartments[0].apartmentCode").value("A1"));

        mvc.perform(get("/api/v1/apartments").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("sort", "memberCount,desc"))
                .andExpect(jsonPath("$.content[0].code").value("A1"))
                .andExpect(jsonPath("$.content[0].ownerName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.content[0].memberCount").value(2))
                .andExpect(jsonPath("$.content[1].memberCount").value(0));
        mvc.perform(get("/api/v1/apartments").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("owner", "văn an"))
                .andExpect(jsonPath("$.content[*].code", Matchers.contains("A1")));
        mvc.perform(get("/api/v1/buildings/{id}", tower.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.apartmentCount").value(2))
                .andExpect(jsonPath("$.residentCount").value(2))
                .andExpect(jsonPath("$.occupiedApartmentCount").value(1));
        assertThat(created.get("id").asLong()).isPositive();
    }

    @Test
    void phoneAndCodeAreUniquePerBuildingOnly() throws Exception {
        create(residentBody("An", "0912345678", a1.getId(), "OWNER", false)).andExpect(status().isCreated());
        create(residentBody("An 2", "+84912345678", a2.getId(), "OWNER", false))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("phone"));
        Map<String, Object> sameCode = residentBody("Bình", "0987654321", a2.getId(), "OWNER", false);
        sameCode.put("code", "cd000001");
        create(sameCode).andExpect(status().isConflict()).andExpect(jsonPath("$.errors[0].field").value("code"));

        Building other = createBuilding();
        Apartment foreign = createApartment(other.getId(), "B1");
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        mvc.perform(post("/api/v1/residents").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                residentBody("An", "0912345678", foreign.getId(), "OWNER", false))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("CD000001"));
    }

    @Test
    void validationErrorsPointAtTheNestedApartmentFields() throws Exception {
        Map<String, Object> body = residentBody("An", "0123", a1.getId(), "TENANT", true);
        apartmentOf(body).remove("moveInDate");
        create(body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", Matchers.hasItems("phone", "apartment.moveInDate")));

        create(residentBody("An", "0912345678", a1.getId(), "TENANT", true))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("apartment.householdHead"));
        Map<String, Object> badId = residentBody("An", "0912345678", a1.getId(), "TENANT", false);
        badId.put("idType", "CCCD");
        badId.put("idNumber", "12345");
        create(badId).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("idNumber"));
    }

    @Test
    void oneHouseholdHeadPerApartmentUntilTheHeadMovesOut() throws Exception {
        long first = id(create(residentBody("Chủ cũ", "0912345678", a1.getId(), "OWNER", true)));
        JsonNode second = json(create(residentBody("Chủ mới", "0912345679", a1.getId(), "OWNER", false)).andReturn());

        Map<String, Object> makeHead = link(a1.getId(), "OWNER", true);
        makeHead.put("version", second.at("/apartments/0/version").asLong());
        send(put("/api/v1/residents/{id}/apartments/{linkId}", second.get("id").asLong(),
                second.at("/apartments/0/id").asLong()), makeHead)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("householdHead"))
                .andExpect(jsonPath("$.detail").value("Căn hộ đã có chủ hộ chính: Chủ cũ."));

        send(post("/api/v1/residents/{id}/move-out", first), Map.of("moveOutDate", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.residenceStatus").value("MOVED_OUT"))
                .andExpect(jsonPath("$.apartments[0].householdHead").value(false));
        send(put("/api/v1/residents/{id}/apartments/{linkId}", second.get("id").asLong(),
                second.at("/apartments/0/id").asLong()), makeHead)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apartments[0].householdHead").value(true));

        mvc.perform(get("/api/v1/residents/apartment/{id}", a1.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].fullName", Matchers.contains("Chủ mới", "Chủ cũ")))
                .andExpect(jsonPath("$[1].residenceStatus").value("MOVED_OUT"));
    }

    @Test
    void databaseRejectsASecondActiveHeadEvenWithoutTheService() throws Exception {
        long first = id(create(residentBody("Chủ 1", "0912345678", a1.getId(), "OWNER", true)));
        long second = id(create(residentBody("Chủ 2", "0912345679", a1.getId(), "OWNER", false)));
        ApartmentResident link = linkRepository.findByApartment(a1.getId(), ResidenceStatus.MOVED_OUT).stream()
                .filter(l -> l.getResident().getId() == second).findFirst().orElseThrow();
        link.setHouseholdHead(true);

        assertThatThrownBy(() -> linkRepository.saveAndFlush(link)).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void assignMoveOutOfOneApartmentAndDeleteRules() throws Exception {
        long id = id(create(residentBody("An", "0912345678", a1.getId(), "OWNER", false)));
        send(post("/api/v1/residents/{id}/apartments", id), link(a1.getId(), "TENANT", false))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("apartmentId"));
        JsonNode assigned = json(send(post("/api/v1/residents/{id}/apartments", id), link(a2.getId(), "TENANT", false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apartments.length()").value(2))
                .andReturn());
        long a2Link = assigned.at("/apartments/1/id").asLong();

        send(post("/api/v1/residents/{id}/move-out", id), Map.of("moveOutDate", LocalDate.now().toString(),
                "linkIds", List.of(a2Link)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.residenceStatus").value("LIVING"));
        mvc.perform(delete("/api/v1/residents/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Cư dân còn đang ở 1 căn hộ, hãy dùng Chuyển đi trước khi xoá."));
        mvc.perform(delete("/api/v1/apartments/{id}", a2.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Căn hộ còn 1 bản ghi cư dân, hãy chuyển sang Không hoạt động."));

        send(post("/api/v1/residents/{id}/move-out", id), Map.of("moveOutDate", LocalDate.now().toString()))
                .andExpect(jsonPath("$.residenceStatus").value("MOVED_OUT"));
        mvc.perform(delete("/api/v1/residents/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/apartments/{id}", a2.getId()).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    @Test
    void listFiltersByStatusApartmentRoleAndPhone() throws Exception {
        create(residentBody("Đang ở", "0912345671", a1.getId(), "OWNER", false));
        Map<String, Object> absent = residentBody("Tạm vắng", "0912345672", a2.getId(), "TENANT", false);
        apartmentOf(absent).put("residenceStatus", "TEMP_ABSENT");
        create(absent);
        long moved = id(create(residentBody("Đã đi", "0912345673", a2.getId(), "TENANT", false)));
        send(post("/api/v1/residents/{id}/move-out", moved), Map.of("moveOutDate", LocalDate.now().toString()));

        list(Map.of("residenceStatus", "LIVING")).andExpect(jsonPath("$.content[*].fullName", Matchers.contains("Đang ở")));
        list(Map.of("residenceStatus", "TEMP_ABSENT"))
                .andExpect(jsonPath("$.content[*].fullName", Matchers.contains("Tạm vắng")));
        list(Map.of("residenceStatus", "MOVED_OUT")).andExpect(jsonPath("$.content[*].fullName", Matchers.contains("Đã đi")));
        // Lọc theo căn chỉ xét cư dân còn ở, trừ khi lọc "Đã chuyển đi".
        list(Map.of("apartment", "a2")).andExpect(jsonPath("$.content[*].fullName", Matchers.contains("Tạm vắng")));
        list(Map.of("apartment", "a2", "residenceStatus", "MOVED_OUT"))
                .andExpect(jsonPath("$.content[*].fullName", Matchers.contains("Đã đi")));
        list(Map.of("role", "OWNER")).andExpect(jsonPath("$.content[*].fullName", Matchers.contains("Đang ở")));
        list(Map.of("phone", "+8491234567")).andExpect(jsonPath("$.totalElements").value(3));
        list(Map.of("keyword", "vắng")).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void futureMoveOutIsAppliedByTheDailyJob() throws Exception {
        JsonNode created = json(create(residentBody("An", "0912345678", a1.getId(), "OWNER", true)).andReturn());
        Map<String, Object> planned = link(a1.getId(), "OWNER", true);
        planned.put("moveOutDate", LocalDate.now().plusDays(5).toString());
        planned.put("version", created.at("/apartments/0/version").asLong());
        send(put("/api/v1/residents/{id}/apartments/{linkId}", created.get("id").asLong(),
                created.at("/apartments/0/id").asLong()), planned)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apartments[0].residenceStatus").value("LIVING"));

        ApartmentResident link = linkRepository.findById(created.at("/apartments/0/id").asLong()).orElseThrow();
        link.setMoveOutDate(LocalDate.now().minusDays(1));
        linkRepository.saveAndFlush(link);
        assertThat(residentService.moveOutDue()).isGreaterThanOrEqualTo(1);

        ApartmentResident after = linkRepository.findById(link.getId()).orElseThrow();
        assertThat(after.getResidenceStatus()).isEqualTo(ResidenceStatus.MOVED_OUT);
        assertThat(after.isHouseholdHead()).isFalse();
    }

    @Test
    void residentsOfOtherBuildingsAreHidden() throws Exception {
        Apartment foreign = createApartment(createBuilding().getId(), "F1");
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long foreignId = id(mvc.perform(post("/api/v1/residents").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(residentBody("Ngoài", "0912345678", foreign.getId(), "OWNER",
                        false)))));

        mvc.perform(get("/api/v1/residents/{id}", foreignId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        create(residentBody("Ngoài 2", "0912345679", foreign.getId(), "OWNER", false)).andExpect(status().isNotFound());
        long mine = id(create(residentBody("Trong", "0912345670", a1.getId(), "OWNER", false)));
        send(post("/api/v1/residents/{id}/apartments", mine), link(foreign.getId(), "TENANT", false))
                .andExpect(status().isNotFound());
    }

    @Test
    void importValidatesTheWholeFileThenImportsValidRowsWithGeneratedCodes() throws Exception {
        create(residentBody("Đã có", "0912000000", a2.getId(), "OWNER", true));
        byte[] file = importFile(List.of(
                List.of("", "Nguyễn An", "912345678", "CCCD", "1085012345", "a1", "Chủ sở hữu", "Có", "01/03/2024"),
                List.of("", "Trần Bình", "0987654321", "", "", "A1", "Thành viên gia đình", "", "2024-03-01"),
                List.of("", "Trùng SĐT", "0912345678", "", "", "A1", "Khách lưu trú", "", "01/03/2024"),
                List.of("", "Căn lạ", "0911111111", "", "", "ZZ9", "Người thuê", "", "01/03/2024"),
                List.of("", "Chủ hộ 2", "0922222222", "", "", "A1", "Chủ sở hữu", "Có", "01/03/2024"),
                List.of("", "Chủ hộ A2", "0933333333", "", "", "A2", "Chủ sở hữu", "Có", "01/03/2024"),
                List.of("", "SĐT có", "0912000000", "", "", "A1", "Người thuê", "", "01/03/2024"),
                List.of("X-1", "Sai ngày", "0944444444", "", "", "A1", "Người thuê", "", "31/02/2024")));

        importExcel(file, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(false))
                .andExpect(jsonPath("$.failed").value(6))
                .andExpect(jsonPath("$.rows[2].message").value("Trùng số điện thoại với dòng 2"))
                .andExpect(jsonPath("$.rows[3].message").value("Không có căn hộ mã \"ZZ9\" trong tòa nhà"))
                .andExpect(jsonPath("$.rows[4].message").value("Căn A1 đã có chủ hộ chính ở dòng 2"))
                .andExpect(jsonPath("$.rows[5].message").value("Căn A2 đã có chủ hộ chính"))
                .andExpect(jsonPath("$.rows[6].message").value("Số điện thoại đã được dùng cho cư dân khác trong tòa nhà"))
                .andExpect(jsonPath("$.rows[7].message").value("Ngày chuyển đến \"31/02/2024\" không đúng định dạng dd/MM/yyyy"));
        list(Map.of()).andExpect(jsonPath("$.totalElements").value(1));

        importExcel(file, false)
                .andExpect(jsonPath("$.imported").value(true))
                .andExpect(jsonPath("$.succeeded").value(2))
                .andExpect(jsonPath("$.rows[0].message").value("Đã nhập (CD000002)"))
                .andExpect(jsonPath("$.rows[1].message").value("Đã nhập (CD000003)"));
        list(Map.of("keyword", "Nguyễn An"))
                .andExpect(jsonPath("$.content[0].phone").value("0912345678"))
                .andExpect(jsonPath("$.content[0].idNumberMasked").value("0010*****345"))
                .andExpect(jsonPath("$.content[0].apartments[0].householdHead").value(true));
    }

    @Test
    void exportMasksIdNumbersAndTemplateDownloads() throws Exception {
        Map<String, Object> body = residentBody("An", "0912345678", a1.getId(), "OWNER", true);
        body.put("idType", "PASSPORT");
        body.put("idNumber", "C1234567");
        create(body);

        MvcResult result = mvc.perform(get("/api/v1/residents/export").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, ExcelWriter.CONTENT_TYPE))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        Matchers.containsString("cu-dan-" + tower.getCode().toLowerCase())))
                .andReturn();
        List<ExcelReader.ExcelRow> rows = ExcelReader.read(
                new ByteArrayInputStream(result.getResponse().getContentAsByteArray()), List.of("Mã cư dân"));
        assertThat(rows).singleElement().satisfies(r -> {
            assertThat(r.get("Số giấy tờ")).isEqualTo("C123*567");
            assertThat(r.get("Căn hộ")).isEqualTo("A1 – Chủ sở hữu (chủ hộ)");
            assertThat(r.get("Tình trạng cư trú")).isEqualTo("Đang ở");
        });

        mvc.perform(get("/api/v1/residents/import-template").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.containsString("mau-nhap-cu-dan.xlsx")));
    }

    @Test
    void staffCanReadButNotWrite() throws Exception {
        String staffToken = login(createUser(unique("staff"), Set.of(tower.getId()), "STAFF").getUsername());
        mvc.perform(get("/api/v1/residents").header(HttpHeaders.AUTHORIZATION, bearer(staffToken)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/residents").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(residentBody("An", "0912345678", a1.getId(), "OWNER",
                                false))))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------- helpers

    private ResultActions create(Map<String, Object> body) throws Exception {
        return send(post("/api/v1/residents"), body);
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions list(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/residents")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString());
        params.forEach(request::param);
        return mvc.perform(request);
    }

    private ResultActions importExcel(byte[] file, boolean stopOnError) throws Exception {
        return mvc.perform(multipart("/api/v1/residents/import")
                .file(new MockMultipartFile("file", "cu-dan.xlsx", ExcelWriter.CONTENT_TYPE, file))
                .param("stopOnError", String.valueOf(stopOnError))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString()));
    }

    private static byte[] importFile(List<List<String>> rows) {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Cư dân", IMPORT_HEADERS);
            rows.forEach(r -> excel.row(sheet, r));
            return excel.toBytes();
        }
    }

    private long id(ResultActions actions) throws Exception {
        return json(actions.andReturn()).get("id").asLong();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static Map<String, Object> link(Long apartmentId, String role, boolean head) {
        Map<String, Object> link = new HashMap<>();
        link.put("apartmentId", apartmentId);
        link.put("role", role);
        link.put("householdHead", head);
        link.put("moveInDate", LocalDate.now().minusYears(1).toString());
        link.put("tempResidenceRegistered", true);
        return link;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> apartmentOf(Map<String, Object> body) {
        return (Map<String, Object>) body.get("apartment");
    }

    private static Map<String, Object> residentBody(String name, String phone, Long apartmentId, String role, boolean head) {
        Map<String, Object> body = new HashMap<>();
        body.put("fullName", name);
        body.put("phone", phone);
        body.put("gender", "MALE");
        body.put("apartment", link(apartmentId, role, head));
        return body;
    }
}
