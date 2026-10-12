package com.bihome.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.voucher.VoucherRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class BookingControllerIT extends AbstractIT {

    @Autowired
    VoucherRepository voucherRepository;

    private Building tower;
    private Apartment a1;
    private Apartment a2;
    private String token;
    private LocalDate tomorrow;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        a2 = createApartment(tower.getId(), "A2");
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        tomorrow = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
    }

    @Test
    void freeAndPaidBookingsWithVoucherCapacityAndWeeklyLimit() throws Exception {
        long pool = amenity(false, 4, 2, 2, 50000);
        // 06:00 miễn phí; 20:00 có phí 50.000đ / lượt.
        JsonNode free = json(send(post("/api/v1/amenity-bookings"), booking(pool, a1, "06:00", 2, null)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.matchesPattern("DK-\\d{6}-\\d{3,}"))));
        assertThat(free.hasNonNull("transaction")).isFalse();

        // Sức chứa khung 06:00 là 4: còn 2 chỗ.
        send(post("/api/v1/amenity-bookings"), booking(pool, a2, "06:00", 3, null)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("peopleCount"))
                .andExpect(jsonPath("$.errors[0].message").value("Khung giờ chỉ còn 2 chỗ."));

        String code = voucher(pool);
        send(post("/api/v1/amenity-bookings/quote"), booking(pool, a1, "20:00", 1, code.toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fee").value(50000))
                .andExpect(jsonPath("$.discount").value(5000))
                .andExpect(jsonPath("$.total").value(45000));
        JsonNode paid = json(send(post("/api/v1/amenity-bookings"), booking(pool, a1, "20:00", 1, code))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.voucherCode").value(code))
                .andExpect(jsonPath("$.total").value(45000))
                .andExpect(jsonPath("$.transaction.status").value("PENDING")));
        assertThat(voucherRepository.findByCode(code).orElseThrow().getUsedCount()).isEqualTo(1);

        // Voucher chỉ có 1 lượt; căn A1 đã dùng hết 2 lượt / tuần.
        send(post("/api/v1/amenity-bookings"), booking(pool, a2, "19:00", 1, code)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("voucherCode"))
                .andExpect(jsonPath("$.errors[0].message").value("Voucher đã hết lượt sử dụng."));
        send(post("/api/v1/amenity-bookings"), booking(pool, a1, "19:00", 1, null)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("apartmentId"));

        // Ghi nhận thanh toán → giao dịch PAID; khả dụng trả về số người đã đặt.
        send(post("/api/v1/amenity-bookings/{id}/pay", paid.get("id").asLong()), Map.of("method", "CASH"))
                .andExpect(jsonPath("$.transaction.status").value("PAID"))
                .andExpect(jsonPath("$.transaction.method").value("CASH"));
        mvc.perform(get("/api/v1/amenity-bookings/availability").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .param("amenityId", String.valueOf(pool)).param("from", tomorrow.toString()))
                .andExpect(jsonPath("$.days[0].slots[0].startTime").value("06:00"))
                .andExpect(jsonPath("$.days[0].slots[0].booked").value(2))
                .andExpect(jsonPath("$.days[0].slots[0].remaining").value(2));
        mvc.perform(get("/api/v1/transactions").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("sourceType", "AMENITY_BOOKING"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].amount").value(45000))
                .andExpect(jsonPath("$.content[0].apartmentCode").value("A1"));
        mvc.perform(get("/api/v1/transactions/export").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(ExcelWriter.CONTENT_TYPE))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.containsString("giao-dich-")));
        mvc.perform(get("/api/v1/amenity-reports").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .param("amenityId", String.valueOf(pool)).param("from", tomorrow.toString()).param("to", tomorrow.toString()))
                .andExpect(jsonPath("$.totalBookings").value(2))
                .andExpect(jsonPath("$.people").value(3))
                .andExpect(jsonPath("$.revenue").value(45000))
                .andExpect(jsonPath("$.collected").value(45000));
    }

    @Test
    void approvalRejectAndCancelReleaseVoucherAndTransactions() throws Exception {
        long bbq = amenity(true, 10, null, 2, 50000);
        String code = voucher(bbq);
        JsonNode pending = json(send(post("/api/v1/amenity-bookings"), booking(bbq, a1, "20:00", 5, code))
                .andExpect(jsonPath("$.status").value("PENDING")));
        // Từ chối: trả voucher, huỷ khoản phí.
        send(post("/api/v1/amenity-bookings/{id}/reject", pending.get("id").asLong()),
                Map.of("reason", "Trùng sự kiện của tòa", "version", pending.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectReason").value("Trùng sự kiện của tòa"))
                .andExpect(jsonPath("$.transaction.status").value("CANCELLED"));
        assertThat(voucherRepository.findByCode(code).orElseThrow().getUsedCount()).isZero();

        // Duyệt, thu tiền rồi huỷ trước hạn huỷ miễn phí (2 giờ) → hoàn tiền.
        JsonNode second = json(send(post("/api/v1/amenity-bookings"), booking(bbq, a1, "20:00", 5, null)));
        JsonNode approved = json(send(post("/api/v1/amenity-bookings/{id}/approve", second.get("id").asLong()),
                Map.of("version", second.get("version").asLong())).andExpect(jsonPath("$.status").value("APPROVED")));
        send(post("/api/v1/amenity-bookings/{id}/pay", second.get("id").asLong()), Map.of("method", "BANK_TRANSFER"));
        JsonNode reloaded = json(mvc.perform(get("/api/v1/amenity-bookings/{id}", second.get("id").asLong())
                .header(HttpHeaders.AUTHORIZATION, bearer(token))));
        send(post("/api/v1/amenity-bookings/{id}/cancel", second.get("id").asLong()),
                Map.of("reason", "Đổi lịch", "version", reloaded.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.transaction.status").value("REFUNDED"));
        assertThat(approved.get("decidedBy").asText()).startsWith("bqm");

        // Hạn huỷ miễn phí 48 giờ → lượt ngày mai huỷ muộn: giữ khoản phí.
        long late = amenity(false, 10, null, 48, 50000);
        JsonNode lateBooking = json(send(post("/api/v1/amenity-bookings"), booking(late, a2, "20:00", 1, null)));
        send(post("/api/v1/amenity-bookings/{id}/cancel", lateBooking.get("id").asLong()),
                Map.of("reason", "Ốm", "version", lateBooking.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.transaction.status").value("PENDING"));
    }

    @Test
    void concurrentBookingsCannotExceedTheSlotCapacity() throws Exception {
        long pool = amenity(false, 1, null, 2, 0);
        List<Apartment> apartments = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            apartments.add(createApartment(tower.getId(), "C" + i));
        }
        ExecutorService pool4 = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Integer>> calls = apartments.stream().<Callable<Integer>>map(a -> () ->
                    send(post("/api/v1/amenity-bookings"), booking(pool, a, "06:00", 1, null)).andReturn().getResponse().getStatus())
                    .toList();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> f : pool4.invokeAll(calls)) {
                statuses.add(f.get());
            }
            assertThat(statuses).containsOnlyOnce(201);
            assertThat(statuses.stream().filter(s -> s == 400)).hasSize(3);
        } finally {
            pool4.shutdown();
        }
    }

    @Test
    void serviceOrdersCreateTransactionsAndCancelReleasesThem() throws Exception {
        long type = json(send(post("/api/v1/service-types"), Map.of("name", unique("Giặt "), "status", "ACTIVE"))).get("id").asLong();
        Map<String, Object> service = new HashMap<>();
        service.put("name", "Giặt rèm");
        service.put("serviceTypeId", type);
        service.put("unitPrice", 45000);
        service.put("unit", "m²");
        service.put("status", "ACTIVE");
        service.put("images", List.of());
        long serviceId = json(send(post("/api/v1/services"), service)).get("id").asLong();

        Map<String, Object> order = new HashMap<>();
        order.put("serviceId", serviceId);
        order.put("apartmentId", a1.getId());
        order.put("quantity", 2.5);
        JsonNode created = json(send(post("/api/v1/service-orders"), order).andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(112500))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.transaction.status").value("PENDING")));
        JsonNode confirmed = json(send(post("/api/v1/service-orders/{id}/confirm", created.get("id").asLong()),
                Map.of("version", created.get("version").asLong())).andExpect(jsonPath("$.status").value("CONFIRMED")));
        send(post("/api/v1/service-orders/{id}/cancel", created.get("id").asLong()),
                Map.of("reason", "Khách đổi ý", "version", confirmed.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.transaction.status").value("CANCELLED"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/services/{id}", serviceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict());
    }

    // ---------------------------------------------------------------- Helpers

    /** Tiện ích mở 06:00–22:00 mọi ngày, lượt 1 giờ; 20:00–22:00 có phí theo lượt (cả ngày thường lẫn cuối tuần). */
    private long amenity(boolean approval, int capacity, Integer perWeek, int freeCancelHours, int price) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("code", unique("AM").toUpperCase());
        body.put("name", "Tiện ích thử");
        body.put("capacity", capacity);
        body.put("openTime", "06:00");
        body.put("closeTime", "22:00");
        body.put("requiresApproval", approval);
        body.put("status", "ACTIVE");
        body.put("images", List.of());
        long id = json(send(post("/api/v1/amenities"), body).andExpect(status().isCreated())).get("id").asLong();
        long version = json(mvc.perform(get("/api/v1/amenities/{id}/config", id).header(HttpHeaders.AUTHORIZATION, bearer(token))))
                .get("version").asLong();
        List<Map<String, Object>> slots = new ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            for (int h = 6; h < 22; h++) {
                slots.add(Map.of("dayOfWeek", day, "startTime", "%02d:00".formatted(h), "endTime", "%02d:00".formatted(h + 1)));
            }
        }
        List<Map<String, Object>> prices = price == 0 ? List.of() : List.of(
                Map.of("dayType", "WEEKDAY", "startTime", "19:00", "endTime", "22:00", "price", price, "priceUnit", "PER_BOOKING"),
                Map.of("dayType", "WEEKEND", "startTime", "19:00", "endTime", "22:00", "price", price, "priceUnit", "PER_BOOKING"));
        Map<String, Object> config = new HashMap<>();
        config.put("slotMinutes", 60);
        config.put("maxBookingsPerWeek", perWeek);
        config.put("maxAdvanceDays", 14);
        config.put("freeCancelHours", freeCancelHours);
        config.put("slots", slots);
        config.put("prices", prices);
        config.put("maintenances", List.of());
        config.put("version", version);
        send(put("/api/v1/amenities/{id}/config", id), config).andExpect(status().isOk());
        return id;
    }

    private String voucher(long amenityId) throws Exception {
        String code = unique("VC").toUpperCase();
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("name", "Giảm 10%");
        body.put("discountType", "PERCENT");
        body.put("discountValue", 10);
        body.put("applyScope", "AMENITY");
        body.put("amenityIds", List.of(amenityId));
        body.put("serviceIds", List.of());
        body.put("totalQuantity", 1);
        body.put("perApartmentLimit", 1);
        body.put("validFrom", LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString());
        body.put("validTo", tomorrow.plusDays(30).toString());
        body.put("status", "ACTIVE");
        send(post("/api/v1/vouchers"), body).andExpect(status().isCreated());
        return code;
    }

    private Map<String, Object> booking(long amenityId, Apartment apartment, String start, int people, String voucher) {
        int hour = Integer.parseInt(start.substring(0, 2));
        Map<String, Object> body = new HashMap<>();
        body.put("amenityId", amenityId);
        body.put("apartmentId", apartment.getId());
        body.put("bookingDate", tomorrow.toString());
        body.put("startTime", start);
        body.put("endTime", "%02d:00".formatted(hour + 1));
        body.put("peopleCount", people);
        body.put("voucherCode", voucher);
        return body;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
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
