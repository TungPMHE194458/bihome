package com.bihome.residentapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ResidentAppIT extends AbstractIT {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};
    private static final String NEW_PASSWORD = "CuDan@2026";

    @Autowired
    ResidentInboxRepository inbox;

    @Autowired
    JdbcTemplate jdbc;

    private Building tower;
    private Apartment a1;
    private Apartment a2;
    private String staff;
    private String phone;
    private long residentId;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        a2 = createApartment(tower.getId(), "A2");
        staff = login(createUser(unique("bql"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        phone = "09" + String.format("%08d", Math.floorMod(System.nanoTime(), 100_000_000L));
        residentId = createResident("Nguyễn Văn An", phone, a1.getId());
    }

    @Test
    void accountLifecycleAndTokenIsolation() throws Exception {
        // Chưa có tài khoản app.
        staff(get("/api/v1/residents/{id}/app-account", residentId), null).andExpect(status().isNotFound());
        String temp = json(staff(post("/api/v1/residents/{id}/app-account", residentId), null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.phone").value(phone))).get("temporaryPassword").asText();
        staff(post("/api/v1/residents/{id}/app-account", residentId), null).andExpect(status().isConflict());
        staff(get("/api/v1/residents/{id}", residentId), null).andExpect(jsonPath("$.appAccountStatus").value("ACTIVE"));

        // Sai mật khẩu / đúng mật khẩu tạm → phải đổi mật khẩu trước.
        app(post("/api/v1/resident/auth/login"), null, Map.of("phone", phone, "password", "Sai@12345"))
                .andExpect(status().isUnauthorized());
        JsonNode tokens = login(phone, temp);
        assertThat(tokens.get("mustChangePassword").asBoolean()).isTrue();
        String access = tokens.get("accessToken").asText();
        app(get("/api/v1/resident/me"), access, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.apartments[0].code").value("A1"))
                .andExpect(jsonPath("$.mustChangePassword").value(true));
        app(get("/api/v1/resident/home").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
        // So thời điểm cấp token với lúc đổi mật khẩu ở độ chính xác giây: đợi sang giây sau để token cũ bị loại.
        Thread.sleep(1100);
        tokens = json(app(post("/api/v1/resident/auth/change-password"), access,
                Map.of("currentPassword", temp, "newPassword", NEW_PASSWORD)).andExpect(status().isOk()));
        assertThat(tokens.get("mustChangePassword").asBoolean()).isFalse();
        // Token cấp trước khi đổi mật khẩu hết hiệu lực.
        app(get("/api/v1/resident/me"), access, null).andExpect(status().isUnauthorized());
        access = tokens.get("accessToken").asText();
        app(get("/api/v1/resident/home").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.outstanding").value(0));

        // Token cư dân không dùng được cho API BQL và ngược lại.
        app(get("/api/v1/residents"), access, null).andExpect(status().isUnauthorized());
        app(get("/api/v1/resident/me"), staff, null).andExpect(status().isUnauthorized());
        // Căn không thuộc cư dân → 404.
        app(get("/api/v1/resident/home").param("apartmentId", a2.getId().toString()), access, null)
                .andExpect(status().isNotFound());

        // Refresh xoay vòng; dùng lại token cũ → thu hồi mọi phiên.
        String refresh = tokens.get("refreshToken").asText();
        JsonNode rotated = json(app(post("/api/v1/resident/auth/refresh"), null, Map.of("refreshToken", refresh))
                .andExpect(status().isOk()));
        app(post("/api/v1/resident/auth/refresh"), null, Map.of("refreshToken", refresh)).andExpect(status().isUnauthorized());
        app(post("/api/v1/resident/auth/refresh"), null, Map.of("refreshToken", rotated.get("refreshToken").asText()))
                .andExpect(status().isUnauthorized());

        // BQL khoá → đăng xuất ngay; mở khoá → đăng nhập lại được.
        access = login(phone, NEW_PASSWORD).get("accessToken").asText();
        staff(post("/api/v1/residents/{id}/app-account/lock", residentId), null).andExpect(jsonPath("$.status").value("LOCKED"));
        app(get("/api/v1/resident/me"), access, null).andExpect(status().isUnauthorized());
        app(post("/api/v1/resident/auth/login"), null, Map.of("phone", phone, "password", NEW_PASSWORD))
                .andExpect(status().isForbidden());
        staff(post("/api/v1/residents/{id}/app-account/unlock", residentId), null).andExpect(jsonPath("$.status").value("ACTIVE"));
        access = login(phone, NEW_PASSWORD).get("accessToken").asText();

        // Cư dân tự xoá tài khoản.
        app(post("/api/v1/resident/me/delete-account"), access, Map.of("password", "Sai@12345"))
                .andExpect(status().isBadRequest());
        app(post("/api/v1/resident/me/delete-account"), access, Map.of("password", NEW_PASSWORD))
                .andExpect(status().isNoContent());
        app(get("/api/v1/resident/me"), access, null).andExpect(status().isUnauthorized());
        app(post("/api/v1/resident/auth/login"), null, Map.of("phone", phone, "password", NEW_PASSWORD))
                .andExpect(status().isUnauthorized());
        staff(get("/api/v1/residents/{id}", residentId), null).andExpect(jsonPath("$.appAccountStatus").value("NONE"));
    }

    @Test
    void ticketsBookingsSosAndInbox() throws Exception {
        String access = activate();
        long category = id(staff(post("/api/v1/ticket-categories"), Map.of("name", unique("Điện "), "responseSlaHours", 2,
                "resolutionSlaHours", 24, "status", "ACTIVE")));

        // Yêu cầu có ảnh đính kèm, kênh APP, người gửi là cư dân.
        long photo = json(mvc.perform(multipart("/api/v1/resident/files")
                .file(new MockMultipartFile("file", "den-hong.png", "image/png", PNG))
                .header(HttpHeaders.AUTHORIZATION, bearer(access))).andExpect(status().isCreated())).get("id").asLong();
        JsonNode ticket = json(app(post("/api/v1/resident/tickets"), access, Map.of("apartmentId", a1.getId(),
                "categoryId", category, "title", "Hỏng đèn hành lang", "fileIds", List.of(photo)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticket.channel").value("APP"))
                .andExpect(jsonPath("$.ticket.residentId").value(residentId))
                .andExpect(jsonPath("$.attachments[0].name").value("den-hong.png")));
        long ticketId = ticket.get("ticket").get("id").asLong();
        mvc.perform(get("/api/v1/resident/files/{id}", photo).header(HttpHeaders.AUTHORIZATION, bearer(access)))
                .andExpect(status().isOk());

        // BQL: bình luận nội bộ bị ẩn khỏi app, bình luận công khai hiện + vào hộp thư.
        staff(post("/api/v1/tickets/{id}/comments", ticketId), Map.of("content", "Kiểm tra cầu dao", "visibility", "INTERNAL"))
                .andExpect(status().isCreated());
        staff(post("/api/v1/tickets/{id}/comments", ticketId), Map.of("content", "Chiều nay thợ sẽ lên", "visibility", "PUBLIC"))
                .andExpect(status().isCreated());
        app(get("/api/v1/resident/tickets/{id}/timeline", ticketId), access, null)
                .andExpect(jsonPath("$[?(@.content == 'Kiểm tra cầu dao')]").isEmpty())
                .andExpect(jsonPath("$[?(@.content == 'Chiều nay thợ sẽ lên')]").isNotEmpty());
        app(post("/api/v1/resident/tickets/{id}/comments", ticketId), access, Map.of("content", "Cảm ơn BQL"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.visibility").value("PUBLIC"));
        app(get("/api/v1/resident/inbox/unread-count"), access, null).andExpect(jsonPath("$.count").value(1));
        JsonNode item = json(app(get("/api/v1/resident/inbox"), access, null)).get("content").get(0);
        assertThat(item.get("link").asText()).isEqualTo("/tickets/" + ticketId);
        app(post("/api/v1/resident/inbox/{id}/read", item.get("id").asLong()), access, null)
                .andExpect(jsonPath("$.read").value(true));
        app(get("/api/v1/resident/tickets").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$.totalElements").value(1));

        // Yêu cầu của căn khác: 404.
        long otherTicket = json(staff(post("/api/v1/tickets"), Map.of("title", "Thấm trần", "categoryId", category,
                "apartmentId", a2.getId(), "channel", "HOTLINE", "priority", "MEDIUM"))
                .andExpect(status().isCreated())).get("ticket").get("id").asLong();
        app(get("/api/v1/resident/tickets/{id}", otherTicket), access, null).andExpect(status().isNotFound());

        // Đặt tiện ích và huỷ.
        long pool = amenity();
        LocalDate tomorrow = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        app(get("/api/v1/resident/amenities").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$[?(@.id == " + pool + ")]").isNotEmpty());
        app(get("/api/v1/resident/amenities/{id}/availability", pool).param("apartmentId", a1.getId().toString())
                .param("from", tomorrow.toString()).param("days", "1"), access, null)
                .andExpect(jsonPath("$.days[0].slots[0].remaining").value(4));
        Map<String, Object> booking = new HashMap<>(Map.of("amenityId", pool, "apartmentId", a1.getId(),
                "bookingDate", tomorrow.toString(), "startTime", "07:00", "endTime", "08:00", "peopleCount", 2));
        JsonNode b = json(app(post("/api/v1/resident/bookings"), access, booking).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.residentId").value(residentId)));
        booking.put("apartmentId", a2.getId());
        app(post("/api/v1/resident/bookings"), access, booking).andExpect(status().isNotFound());
        app(post("/api/v1/resident/bookings/{id}/cancel", b.get("id").asLong()), access,
                Map.of("reason", "Bận việc", "version", b.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // SOS từ app: nguồn APP, kèm SĐT cư dân; BQL thấy ở danh sách đang mở.
        app(post("/api/v1/resident/sos"), access, Map.of("apartmentId", a1.getId(), "alertType", "MEDICAL"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("APP"))
                .andExpect(jsonPath("$.reporterPhone").value(phone));
        staff(get("/api/v1/sos-alerts/active"), null).andExpect(jsonPath("$.count").value(1));

        // Thông báo phí: chưa có; id lạ → 404.
        app(get("/api/v1/resident/fee-notices").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$.totalElements").value(0));
        app(get("/api/v1/resident/fee-notices/{id}", 999_999_999L), access, null).andExpect(status().isNotFound());

        // Thông báo BQL gửi cư dân → hộp thư.
        long before = inbox.countByResidentIdAndReadAtIsNull(residentId);
        JsonNode ann = json(staff(post("/api/v1/announcements"), Map.of("title", "Cắt nước 9h sáng mai",
                "content", "Bảo trì bể nước tầng mái", "category", "MAINTENANCE", "audience", "ALL", "fileIds", List.of()))
                .andExpect(status().isCreated()));
        staff(post("/api/v1/announcements/{id}/send", ann.get("id").asLong()), Map.of("version", ann.get("version").asLong()))
                .andExpect(status().isOk());
        assertThat(inbox.countByResidentIdAndReadAtIsNull(residentId)).isEqualTo(before + 1);
    }

    @Test
    void declarationsSurveysServicesAndDocuments() throws Exception {
        String access = activate();

        // Kê khai thành viên (chưa có SĐT) → BQL bổ sung SĐT khi duyệt → tạo cư dân ở căn, báo về hộp thư.
        long photo = json(mvc.perform(multipart("/api/v1/resident/files")
                .file(new MockMultipartFile("file", "be-anh.png", "image/png", PNG)).param("purpose", "RESIDENT_AVATAR")
                .header(HttpHeaders.AUTHORIZATION, bearer(access))).andExpect(status().isCreated())).get("id").asLong();
        JsonNode member = json(app(post("/api/v1/resident/declarations/members"), access, Map.of("apartmentId", a1.getId(),
                "fullName", "Nguyễn Bảo Anh", "role", "FAMILY", "relationship", "CHILD", "dateOfBirth", "2015-05-01",
                "photoFileId", photo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.startsWith("KK-"))));
        long memberId = member.get("id").asLong();
        staff(post("/api/v1/declarations/{id}/approve", memberId), Map.of("version", member.get("version").asLong()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[0].field").value("phone"));
        String childPhone = "08" + phone.substring(2);
        staff(post("/api/v1/declarations/{id}/approve", memberId), Map.of("phone", childPhone, "version",
                member.get("version").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.resultResidentId").isNumber());
        app(get("/api/v1/resident/apartments/{id}/members", a1.getId()), access, null)
                .andExpect(jsonPath("$[?(@.fullName == 'Nguyễn Bảo Anh')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.fullName == 'Nguyễn Bảo Anh')].avatarUrl").value(org.hamcrest.Matchers.hasItem(
                        org.hamcrest.Matchers.endsWith("/" + photo))));
        mvc.perform(get("/api/v1/resident/files/{id}", photo).header(HttpHeaders.AUTHORIZATION, bearer(access)))
                .andExpect(status().isOk());
        app(get("/api/v1/resident/inbox"), access, null)
                .andExpect(jsonPath("$.content[0].type").value("DECLARATION"));

        // Kê khai xe → từ chối (bắt buộc lý do) / kê khai lại → duyệt → hạng mục xe của căn.
        long category = id(staff(post("/api/v1/asset-categories"), Map.of("buildingId", tower.getId(), "name", unique("Xe máy "),
                "unit", "chiếc", "status", "ACTIVE")));
        app(get("/api/v1/resident/apartments/{id}/vehicle-categories", a1.getId()), access, null)
                .andExpect(jsonPath("$[?(@.id == " + category + ")]").isNotEmpty());
        Map<String, Object> vehicle = Map.of("apartmentId", a1.getId(), "categoryId", category, "vehicleName", "Honda Vision",
                "plateNumber", " 29b1 - 123.45 ");
        JsonNode v = json(app(post("/api/v1/resident/declarations/vehicles"), access, vehicle).andExpect(status().isCreated())
                .andExpect(jsonPath("$.plateNumber").value("29B1 - 123.45")));
        app(post("/api/v1/resident/declarations/vehicles"), access, vehicle).andExpect(status().isConflict());
        staff(post("/api/v1/declarations/{id}/reject", v.get("id").asLong()), Map.of("reason", " ", "version",
                v.get("version").asLong())).andExpect(status().isBadRequest());
        staff(post("/api/v1/declarations/{id}/reject", v.get("id").asLong()), Map.of("reason", "Thiếu ảnh đăng ký xe",
                "version", v.get("version").asLong())).andExpect(jsonPath("$.status").value("REJECTED"));
        v = json(app(post("/api/v1/resident/declarations/vehicles"), access, vehicle).andExpect(status().isCreated()));
        staff(post("/api/v1/declarations/{id}/approve", v.get("id").asLong()), Map.of("version", v.get("version").asLong()))
                .andExpect(jsonPath("$.resultAssetItemId").isNumber());
        app(get("/api/v1/resident/apartments/{id}/vehicles", a1.getId()), access, null)
                .andExpect(jsonPath("$[0].plateNumber").value("29B1 - 123.45"));
        staff(get("/api/v1/declarations").param("status", "PENDING"), null).andExpect(jsonPath("$.totalElements").value(0));

        // Phiếu ghi lại cư dân được tạo khi duyệt.
        long kid = json(staff(get("/api/v1/declarations/{id}", memberId), null)).get("resultResidentId").asLong();
        assertThat(kid).isPositive();

        // Khảo sát ẩn danh: trả lời một lần, lịch sử không lộ người trả lời.
        Map<String, Object> survey = new HashMap<>();
        survey.put("title", "Giờ mở hồ bơi");
        survey.put("audience", "ALL");
        survey.put("targets", List.of());
        survey.put("startAt", java.time.OffsetDateTime.now().minusHours(1));
        survey.put("endAt", java.time.OffsetDateTime.now().plusDays(3));
        survey.put("anonymous", true);
        survey.put("questions", List.of(Map.of("type", "RATING", "content", "Mức độ hài lòng", "required", true,
                "options", List.of())));
        JsonNode s = json(staff(post("/api/v1/surveys"), survey).andExpect(status().isCreated()));
        s = json(staff(post("/api/v1/surveys/{id}/publish", s.get("id").asLong()), Map.of("version", s.get("version").asLong())));
        long surveyId = s.get("id").asLong();
        long question = s.get("questions").get(0).get("id").asLong();
        app(get("/api/v1/resident/surveys").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$[?(@.id == " + surveyId + ")].answered").value(false));
        Map<String, Object> answer = Map.of("apartmentId", a1.getId(), "answers", List.of(Map.of("questionId", question, "rating", 4)));
        app(post("/api/v1/resident/surveys/{id}/responses", surveyId), access, answer).andExpect(status().isNoContent());
        app(post("/api/v1/resident/surveys/{id}/responses", surveyId), access, answer).andExpect(status().isConflict());
        app(get("/api/v1/resident/surveys/{id}", surveyId).param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$.answered").value(true));
        Integer named = jdbc.queryForObject("SELECT COUNT(*) FROM SURVEY_RESPONSE WHERE SURVEY_ID = ? AND (RESIDENT_ID IS NOT NULL "
                + "OR CREATED_BY LIKE ?)", Integer.class, surveyId, "%" + phone + "%");
        assertThat(named).isZero();

        // Đặt dịch vụ và huỷ.
        long type = id(staff(post("/api/v1/service-types"), Map.of("name", unique("Vệ sinh "), "status", "ACTIVE")));
        long service = id(staff(post("/api/v1/services"), Map.of("name", "Vệ sinh căn hộ", "serviceTypeId", type,
                "unitPrice", 120000, "unit", "giờ", "status", "ACTIVE", "images", List.of())));
        app(get("/api/v1/resident/services").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$[?(@.id == " + service + ")]").isNotEmpty());
        Map<String, Object> order = Map.of("serviceId", service, "apartmentId", a1.getId(), "quantity", 2);
        app(post("/api/v1/resident/service-orders/quote"), access, order).andExpect(jsonPath("$.total").value(240000));
        JsonNode o = json(app(post("/api/v1/resident/service-orders"), access, order).andExpect(status().isCreated())
                .andExpect(jsonPath("$.residentId").value(residentId)));
        app(post("/api/v1/resident/service-orders/{id}/cancel", o.get("id").asLong()), access,
                Map.of("reason", "Đổi lịch", "version", o.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // Thẻ từ (chưa có) và tài liệu (chưa có) vẫn trả danh sách rỗng.
        app(get("/api/v1/resident/apartments/{id}/access-cards", a1.getId()), access, null).andExpect(jsonPath("$.length()").value(0));
        app(get("/api/v1/resident/documents").param("apartmentId", a1.getId().toString()), access, null)
                .andExpect(jsonPath("$.totalElements").value(0));
        // Căn khác: 404.
        app(get("/api/v1/resident/apartments/{id}/members", a2.getId()), access, null).andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- Helpers

    /** Tạo tài khoản app, đổi mật khẩu tạm, trả access token. */
    private String activate() throws Exception {
        String temp = json(staff(post("/api/v1/residents/{id}/app-account", residentId), null)).get("temporaryPassword").asText();
        String access = login(phone, temp).get("accessToken").asText();
        return json(app(post("/api/v1/resident/auth/change-password"), access,
                Map.of("currentPassword", temp, "newPassword", NEW_PASSWORD))).get("accessToken").asText();
    }

    private JsonNode login(String phone, String password) throws Exception {
        return json(app(post("/api/v1/resident/auth/login"), null, Map.of("phone", phone, "password", password,
                "deviceName", "iPhone thử")).andExpect(status().isOk()));
    }

    private long createResident(String name, String phone, long apartmentId) throws Exception {
        Map<String, Object> link = new HashMap<>();
        link.put("apartmentId", apartmentId);
        link.put("role", "OWNER");
        link.put("householdHead", false);
        link.put("moveInDate", LocalDate.now().minusYears(1).toString());
        link.put("tempResidenceRegistered", false);
        return id(staff(post("/api/v1/residents"), Map.of("fullName", name, "phone", phone, "apartment", link))
                .andExpect(status().isCreated()));
    }

    /** Hồ bơi mở 06:00–22:00 mọi ngày, lượt 1 giờ, 4 người, tự duyệt, miễn phí. */
    private long amenity() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("code", unique("AM").toUpperCase());
        body.put("name", "Hồ bơi thử");
        body.put("capacity", 4);
        body.put("openTime", "06:00");
        body.put("closeTime", "22:00");
        body.put("requiresApproval", false);
        body.put("status", "ACTIVE");
        body.put("images", List.of());
        long id = id(staff(post("/api/v1/amenities"), body).andExpect(status().isCreated()));
        long version = json(staff(get("/api/v1/amenities/{id}/config", id), null)).get("version").asLong();
        List<Map<String, Object>> slots = new ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            for (int h = 6; h < 22; h++) {
                slots.add(Map.of("dayOfWeek", day, "startTime", "%02d:00".formatted(h), "endTime", "%02d:00".formatted(h + 1)));
            }
        }
        Map<String, Object> config = new HashMap<>();
        config.put("slotMinutes", 60);
        config.put("maxBookingsPerWeek", null);
        config.put("maxAdvanceDays", 14);
        config.put("freeCancelHours", 2);
        config.put("slots", slots);
        config.put("prices", List.of());
        config.put("maintenances", List.of());
        config.put("version", version);
        staff(put("/api/v1/amenities/{id}/config", id), config).andExpect(status().isOk());
        return id;
    }

    private ResultActions staff(MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, bearer(staff)).header("X-Building-Id", tower.getId().toString());
        return perform(request, body);
    }

    private ResultActions app(MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, bearer(token));
        }
        return perform(request, body);
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, Object body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private long id(ResultActions actions) throws Exception {
        return json(actions).get("id").asLong();
    }
}
