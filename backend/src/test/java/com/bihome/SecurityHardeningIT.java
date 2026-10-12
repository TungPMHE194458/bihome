package com.bihome;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.storage.OrphanFileCleanupJob;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Rà soát Phase 16: quyền xem / gắn tệp, phạm vi quản lý người dùng, khớp biến động số dư theo tòa, lịch sử khi xoá. */
class SecurityHardeningIT extends AbstractIT {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    OrphanFileCleanupJob orphanJob;

    private Building towerA;
    private Building towerB;
    private Apartment a1;
    private Apartment a2;
    private Apartment b1;
    private String managerA;
    private String managerB;
    private String admin;
    private final String period = YearMonth.now().minusMonths(1).toString();

    @BeforeEach
    void setUp() throws Exception {
        towerA = createBuilding();
        towerB = createBuilding();
        a1 = createApartment(towerA.getId(), "A1");
        a2 = createApartment(towerA.getId(), "A2");
        b1 = createApartment(towerB.getId(), "B1");
        managerA = login(createUser(unique("bqla"), Set.of(towerA.getId()), "BUILDING_MANAGER").getUsername());
        managerB = login(createUser(unique("bqlb"), Set.of(towerB.getId()), "BUILDING_MANAGER").getUsername());
        admin = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
    }

    @Test
    void attachedFilesFollowBuildingAccessAndCannotBeReattached() throws Exception {
        long file = upload(managerA);
        // Chưa gắn: chỉ người tải lên xem được.
        mvc.perform(get("/api/v1/files/{id}", file).header(HttpHeaders.AUTHORIZATION, bearer(managerA))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/files/{id}", file).header(HttpHeaders.AUTHORIZATION, bearer(managerB)))
                .andExpect(status().isNotFound());

        send(managerA, towerA, post("/api/v1/meter-readings"), Map.of("apartmentId", a1.getId(), "period", period,
                "meterType", "ELECTRIC", "oldIndex", 0, "newIndex", 10, "imageFileId", file)).andExpect(status().isCreated());
        String staffA = login(createUser(unique("nva"), Set.of(towerA.getId()), "STAFF").getUsername());
        mvc.perform(get("/api/v1/files/{id}", file).header(HttpHeaders.AUTHORIZATION, bearer(staffA))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/files/{id}", file).header(HttpHeaders.AUTHORIZATION, bearer(managerB)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/files/{id}", file).header(HttpHeaders.AUTHORIZATION, bearer(admin))).andExpect(status().isOk());

        // Gắn lại tệp đã thuộc bản ghi khác (rồi gỡ sẽ xoá mất tệp của bản ghi kia) → từ chối.
        send(managerA, towerA, post("/api/v1/meter-readings"), Map.of("apartmentId", a2.getId(), "period", period,
                "meterType", "ELECTRIC", "oldIndex", 0, "newIndex", 10, "imageFileId", file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("imageFileId"));

        // Tệp bỏ dở quá 24 giờ được dọn; tệp đang dùng giữ nguyên.
        long orphan = upload(managerA);
        jdbc.update("UPDATE FILE_ATTACHMENT SET CREATED_AT = SYSTIMESTAMP - INTERVAL '2' DAY WHERE ID IN (?, ?)", orphan, file);
        assertThat(orphanJob.cleanup()).isPositive();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM FILE_ATTACHMENT WHERE ID = ?", Integer.class, orphan)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM FILE_ATTACHMENT WHERE ID = ?", Integer.class, file)).isOne();
    }

    @Test
    void nonAdminUserManagersStayInsideTheirBuildingsAndPermissions() throws Exception {
        JsonNode role = json(mvc.perform(post("/api/v1/roles").header(HttpHeaders.AUTHORIZATION, bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "code", "HR_" + System.nanoTime() % 100000, "name", unique("Nhân sự"),
                        "permissions", List.of("USER_READ", "USER_WRITE", "ROLE_READ", "ROLE_WRITE"))))));
        var hr = createUser(unique("nhansu"), Set.of(towerA.getId()), role.get("code").asText());
        String hrToken = login(hr.getUsername());
        var colleague = createUser(unique("dongnghiep"), Set.of(towerA.getId()), "STAFF");
        var outsider = createUser(unique("toakhac"), Set.of(towerB.getId()), "STAFF");

        String list = mvc.perform(get("/api/v1/users?size=50").header(HttpHeaders.AUTHORIZATION, bearer(hrToken)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(list).contains(colleague.getUsername()).doesNotContain(outsider.getUsername());
        mvc.perform(get("/api/v1/users/{id}", outsider.getId()).header(HttpHeaders.AUTHORIZATION, bearer(hrToken)))
                .andExpect(status().isNotFound());

        // Tự thêm tòa khác / tự nâng quyền đều bị chặn.
        mvc.perform(put("/api/v1/users/{id}/buildings", hr.getId()).header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("buildingIds", List.of(towerA.getId(), towerB.getId())))))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/users/{id}/roles", colleague.getId()).header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("roleCodes", List.of("SUPER_ADMIN")))))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/users/{id}/roles", colleague.getId()).header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("roleCodes", List.of("BUILDING_MANAGER")))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/roles").header(HttpHeaders.AUTHORIZATION, bearer(hrToken))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "code", "ALL_" + System.nanoTime() % 100000, "name", unique("Toàn quyền"),
                        "permissions", List.of("USER_READ", "FEE_NOTICE_WRITE")))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/login-history").header(HttpHeaders.AUTHORIZATION, bearer(hrToken)))
                .andExpect(status().isForbidden());

        // Dọn vai trò tự tạo (CSDL dùng chung giữa các lớp test, UserControllerIT kiểm tra danh sách vai trò mặc định).
        long roleId = role.get("id").asLong();
        jdbc.update("DELETE FROM USER_ROLE WHERE ROLE_ID = ?", roleId);
        jdbc.update("DELETE FROM ROLE_PERMISSION WHERE ROLE_ID = ?", roleId);
        jdbc.update("DELETE FROM ROLE WHERE ID = ?", roleId);
    }

    @Test
    void bankTransfersOnlyMatchNoticesOfTheReceivingAccountBuilding() throws Exception {
        long noticeA = issueNotice(managerA, towerA, a1);
        String codeA = feeNoticeCode(noticeA);
        long noticeB = issueNotice(managerB, towerB, b1);

        // Giả lập ở tòa B nhưng nội dung nhắc mã thông báo của tòa A → không được ghi vào tòa A.
        send(managerB, towerB, post("/api/v1/vietqr-settings/simulate"),
                Map.of("feeNoticeId", noticeB, "amount", 1000, "content", "BIHOME " + codeA))
                .andExpect(jsonPath("$.status").value("UNMATCHED"));
        // Tài khoản nhận tiền không thuộc tòa nào → không khớp.
        mvc.perform(post("/api/v1/webhooks/bank").header("X-Webhook-Secret", WEBHOOK_SECRET)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of(
                        "reference", unique("FT"), "accountNo", "999999999", "amount", 1000, "content", "BIHOME " + codeA))))
                .andExpect(jsonPath("$.status").value("UNMATCHED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM PAYMENT WHERE FEE_NOTICE_ID = ?", Integer.class, noticeA)).isZero();
    }

    @Test
    void concurrentPaymentsCannotExceedTheOutstandingAmount() throws Exception {
        long notice = issueNotice(managerA, towerA, a1);
        // Thông báo 30.000 đ; 4 phiếu 20.000 đ gửi đồng thời: khoá dòng thông báo phí → chỉ một phiếu thành công.
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Integer>> calls = IntStream.range(0, 4).<Callable<Integer>>mapToObj(i -> () ->
                    send(managerA, towerA, post("/api/v1/payments"), Map.of("feeNoticeId", notice, "amount", 20000,
                            "method", "CASH")).andReturn().getResponse().getStatus()).toList();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> f : pool.invokeAll(calls)) {
                statuses.add(f.get());
            }
            assertThat(statuses).containsOnlyOnce(201);
        } finally {
            pool.shutdown();
        }
        assertThat(jdbc.queryForObject("SELECT PAID_AMOUNT FROM FEE_NOTICE WHERE ID = ?", Long.class, notice)).isEqualTo(20000L);
    }

    @Test
    void deletingAnAmenityKeepsTheBuildingOnItsAuditEntries() throws Exception {
        long amenity = json(send(managerA, towerA, post("/api/v1/amenities"), Map.of("code", "GYM" + System.nanoTime() % 100000,
                "name", "Phòng gym", "capacity", 10, "openTime", "06:00", "closeTime", "22:00", "status", "ACTIVE",
                "requiresApproval", false)).andExpect(status().isCreated())).get("id").asLong();
        send(managerA, towerA, delete("/api/v1/amenities/{id}", amenity), null).andExpect(status().isNoContent());
        List<Long> buildings = jdbc.queryForList("SELECT BUILDING_ID FROM AUDIT_LOG WHERE ENTITY_TYPE = 'AMENITY_CONFIG' "
                + "AND ENTITY_ID = ? AND ACTION = 'DELETE'", Long.class, String.valueOf(amenity));
        assertThat(buildings).containsExactly(towerA.getId());
    }

    private long issueNotice(String token, Building tower, Apartment apartment) throws Exception {
        send(token, tower, put("/api/v1/fee-rates"), Map.of("vatPercent", 0, "dueDay", 28,
                "otherCharges", List.of(Map.of("name", "Phí vệ sinh", "amount", 30000)))).andExpect(status().isOk());
        send(token, tower, put("/api/v1/vietqr-settings"), Map.of("bankBin", "970436",
                "accountNo", "7700" + tower.getId(), "accountName", "BQL", "contentTemplate", "BIHOME {MA_THONG_BAO}",
                "enabled", true)).andExpect(status().isOk());
        send(token, tower, post("/api/v1/fee-notices/generate"), Map.of("period", period,
                "apartmentIds", List.of(apartment.getId()))).andExpect(status().isCreated());
        JsonNode n = json(send(token, tower, get("/api/v1/fee-notices?apartmentId={a}", apartment.getId()), null))
                .get("content").get(0);
        send(token, tower, post("/api/v1/fee-notices/{id}/issue", n.get("id").asLong()),
                Map.of("version", n.get("version").asLong())).andExpect(status().isOk());
        return n.get("id").asLong();
    }

    private String feeNoticeCode(long id) {
        return jdbc.queryForObject("SELECT CODE FROM FEE_NOTICE WHERE ID = ?", String.class, id);
    }

    private long upload(String token) throws Exception {
        return json(mvc.perform(multipart("/api/v1/files").file(new MockMultipartFile("file", "dong-ho.png", "image/png", PNG))
                .param("purpose", "METER_IMAGE").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isCreated())).get("id").asLong();
    }

    private ResultActions send(String token, Building tower, MockHttpServletRequestBuilder request, Object body) throws Exception {
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
