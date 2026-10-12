package com.bihome.feenotice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.exception.BusinessException;
import com.bihome.transaction.FinancialTransaction;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.transaction.FinancialTransactionRepository;
import com.bihome.transaction.TransactionService;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class FeeNoticeControllerIT extends AbstractIT {

    @Autowired
    TransactionService transactionService;

    @Autowired
    FinancialTransactionRepository transactionRepository;

    @Autowired
    FeeNoticeRepository feeNoticeRepository;

    @Autowired
    FeeNoticeService feeNoticeService;

    private Building tower;
    private Apartment a1;
    private Apartment a2;
    private String token;
    private final String previous = YearMonth.now().minusMonths(2).toString();
    private final String period = YearMonth.now().minusMonths(1).toString();
    private final String current = YearMonth.now().toString();

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        a2 = createApartment(tower.getId(), "A2");
        token = login(createUser(unique("ketoan"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        send(put("/api/v1/fee-rates"), rates()).andExpect(status().isOk())
                .andExpect(jsonPath("$.electricTiers.length()").value(2))
                .andExpect(jsonPath("$.version").isNumber());
    }

    @Test
    void meterChainLocksAfterIssueAndWarnsOnSpikes() throws Exception {
        long first = json(send(post("/api/v1/meter-readings"), reading(a1, previous, "ELECTRIC", "1000", "1100"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.consumption").value(100.0))
                .andExpect(jsonPath("$.firstReading").value(true))).get("id").asLong();
        JsonNode second = json(send(post("/api/v1/meter-readings"), reading(a1, period, "ELECTRIC", "5", "1250"))
                .andExpect(jsonPath("$.oldIndex").value(1100.0))
                .andExpect(jsonPath("$.consumption").value(150.0))
                .andExpect(jsonPath("$.firstReading").value(false)));
        send(post("/api/v1/meter-readings"), reading(a1, period, "ELECTRIC", null, "1300")).andExpect(status().isConflict());
        send(post("/api/v1/meter-readings"), reading(a1, current.substring(0, 4) + "-13", "WATER", null, "1"))
                .andExpect(status().isBadRequest());

        // Sửa kỳ trước làm đổi chỉ số cũ kỳ sau; chỉ số mới kỳ trước vượt kỳ sau thì báo lỗi.
        JsonNode firstNode = json(send(get("/api/v1/meter-readings/{id}", first), null));
        send(put("/api/v1/meter-readings/{id}", first), update("1000", "1300", firstNode.get("version").asLong()))
                .andExpect(status().isBadRequest());
        send(put("/api/v1/meter-readings/{id}", first), update("1000", "1150", firstNode.get("version").asLong()))
                .andExpect(status().isOk());
        send(get("/api/v1/meter-readings/{id}", second.get("id").asLong()), null)
                .andExpect(jsonPath("$.oldIndex").value(1150.0))
                .andExpect(jsonPath("$.consumption").value(100.0))
                .andExpect(jsonPath("$.averageConsumption").value(150.0));

        // Lưới nhập nhanh: a2 kỳ đầu + kỳ sau tăng bất thường.
        send(put("/api/v1/meter-readings/sheet"), Map.of("period", previous, "meterType", "ELECTRIC",
                "rows", List.of(Map.of("apartmentId", a2.getId(), "oldIndex", 0, "newIndex", 100))))
                .andExpect(jsonPath("$.created").value(1));
        send(put("/api/v1/meter-readings/sheet"), Map.of("period", period, "meterType", "ELECTRIC",
                "rows", List.of(Map.of("apartmentId", a2.getId(), "newIndex", 500), Map.of("apartmentId", a1.getId()))))
                .andExpect(jsonPath("$.created").value(1));
        send(get("/api/v1/meter-readings/sheet?period={p}&meterType=ELECTRIC&floor=12", period), null)
                .andExpect(jsonPath("$.rows.length()").value(2))
                .andExpect(jsonPath("$.rows[1].spike").value(true))
                .andExpect(jsonPath("$.rows[1].oldIndex").value(100.0));
        send(get("/api/v1/meter-readings?spike=true&period={p}", period), null)
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].apartmentCode").value("A2"));

        // Phát hành thông báo phí của a1 → khoá số liệu kỳ đó của a1.
        send(post("/api/v1/fee-notices/generate"), Map.of("period", period, "apartmentIds", List.of(a1.getId()),
                "dueDate", LocalDate.now().plusDays(10).toString())).andExpect(jsonPath("$.created").value(1));
        JsonNode notice = json(send(get("/api/v1/fee-notices?period={p}&apartmentId={a}", period, a1.getId()), null))
                .get("content").get(0);
        send(post("/api/v1/fee-notices/{id}/issue", notice.get("id").asLong()), Map.of("version", notice.get("version").asLong()))
                .andExpect(jsonPath("$.summary.status").value("ISSUED"));
        JsonNode locked = json(send(get("/api/v1/meter-readings/{id}", second.get("id").asLong()), null)
                .andExpect(jsonPath("$.locked").value(true)));
        send(put("/api/v1/meter-readings/{id}", second.get("id").asLong()), update(null, "1400", locked.get("version").asLong()))
                .andExpect(status().isConflict());
        send(delete("/api/v1/meter-readings/{id}", second.get("id").asLong()), null).andExpect(status().isConflict());
    }

    @Test
    void generatesPreviewsIssuesAndCollectsWithVietQr() throws Exception {
        send(post("/api/v1/meter-readings"), reading(a1, period, "ELECTRIC", "1000", "1150")).andExpect(status().isCreated());
        send(post("/api/v1/meter-readings"), reading(a1, period, "WATER", "10", "20")).andExpect(status().isCreated());
        FinancialTransaction laundry = transactionService.record(SourceType.SERVICE_ORDER, 990_001L, "DV-TEST-01",
                tower.getId(), a1.getId(), null, new BigDecimal("50000"), "Giặt là").orElseThrow();

        // Xem trước: a1 đủ khoản, a2 thiếu số liệu điện nước.
        send(post("/api/v1/fee-notices/preview"), Map.of("period", period))
                .andExpect(jsonPath("$.apartmentCount").value(2))
                .andExpect(jsonPath("$.toCreate").value(2))
                .andExpect(jsonPath("$.rows[0].apartmentCode").value("A1"))
                // 528.500 quản lý + 290.000 điện (50×1.800 + 100×2.000) + 150.000 nước + 30.000 vệ sinh,
                // VAT 10% = 99.850, giặt là 50.000.
                .andExpect(jsonPath("$.rows[0].total").value(1148350))
                .andExpect(jsonPath("$.rows[0].items[6].type").value("SERVICE"))
                .andExpect(jsonPath("$.rows[1].warnings.length()").value(2));
        assertThat(feeNoticeRepository.countByApartmentId(a1.getId())).isZero();

        send(post("/api/v1/fee-notices/generate"), Map.of("period", period)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.created").value(2));
        send(post("/api/v1/fee-notices/generate"), Map.of("period", period)).andExpect(jsonPath("$.created").value(0))
                .andExpect(jsonPath("$.skipped").value(2));
        assertThat(transactionRepository.findById(laundry.getId()).orElseThrow().getFeeNoticeId()).isNotNull();
        assertThatThrownBy(() -> transactionService.pay(SourceType.SERVICE_ORDER, 990_001L,
                FinancialTransaction.Method.CASH)).isInstanceOf(BusinessException.class);

        JsonNode list = json(send(get("/api/v1/fee-notices?period={p}&sort=apartmentCode,asc", period), null));
        long id = list.get("content").get(0).get("id").asLong();
        long a2Notice = list.get("content").get(1).get("id").asLong();
        JsonNode n = json(send(get("/api/v1/fee-notices/{id}", id), null));
        String code = n.get("summary").get("code").asText();

        // Sửa nháp: thêm giảm trừ, VAT tự tính lại.
        List<Map<String, Object>> items = new ArrayList<>();
        n.get("items").forEach(i -> items.add(item(i)));
        items.add(Map.of("type", "DISCOUNT", "description", "Giảm trừ khuyến mãi", "amount", 48350));
        n = json(send(put("/api/v1/fee-notices/{id}", id), Map.of("dueDate", LocalDate.now().plusDays(10).toString(),
                "items", items, "version", n.get("summary").get("version").asLong())).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalAmount").value(1100000))
                .andExpect(jsonPath("$.items[-1:].type").value("DISCOUNT")));

        // Bật VietQR, phát hành, xem QR / PDF.
        send(put("/api/v1/vietqr-settings"), Map.of("bankBin", "970436", "accountNo", "0123456789",
                "accountName", "Ban quản lý Tòa nhà", "contentTemplate", "BIHOME {MA_THONG_BAO}", "enabled", true))
                .andExpect(jsonPath("$.accountName").value("BAN QUAN LY TOA NHA"));
        send(post("/api/v1/fee-notices/{id}/issue", id), Map.of("version", n.get("summary").get("version").asLong()))
                .andExpect(jsonPath("$.summary.status").value("ISSUED"))
                .andExpect(jsonPath("$.vietQrAvailable").value(true));
        send(get("/api/v1/fee-notices/{id}/vietqr", id), null)
                .andExpect(jsonPath("$.content").value("BIHOME " + code))
                .andExpect(jsonPath("$.payload").value(containsString("54071100000")));
        send(get("/api/v1/fee-notices/{id}/vietqr.png", id), null).andExpect(content().contentType(MediaType.IMAGE_PNG));
        byte[] pdf = send(get("/api/v1/fee-notices/{id}/pdf", id), null)
                .andExpect(content().contentType(MediaType.APPLICATION_PDF)).andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");

        // Thu tiền mặt một phần, vượt số còn nợ bị chặn.
        send(post("/api/v1/payments"), Map.of("feeNoticeId", id, "amount", 2_000_000, "method", "CASH"))
                .andExpect(status().isBadRequest());
        JsonNode cash = json(send(post("/api/v1/payments"), Map.of("feeNoticeId", id, "amount", 400_000, "method", "CASH"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reconcileStatus").value("MATCHED")));
        send(get("/api/v1/fee-notices/{id}", id), null).andExpect(jsonPath("$.summary.status").value("PARTIAL"))
                .andExpect(jsonPath("$.summary.outstanding").value(700000));
        send(get("/api/v1/payments/{id}/receipt", cash.get("id").asLong()), null)
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));

        // Webhook: sai secret, khớp đủ số còn nợ, gửi lại, không có mã.
        Map<String, Object> event = new HashMap<>(Map.of("reference", unique("FT"), "accountNo", "0123456789",
                "amount", 700_000, "content", "MBVCB.889 bihome " + code.replace("-", "") + " CT tu 0987"));
        mvc.perform(post("/api/v1/webhooks/bank").header("X-Webhook-Secret", "sai")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(event)))
                .andExpect(status().isUnauthorized());
        webhook(event).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("MATCHED"))
                .andExpect(jsonPath("$.feeNoticeCode").value(code));
        webhook(event).andExpect(jsonPath("$.status").value("DUPLICATE"));
        webhook(Map.of("reference", unique("FT"), "accountNo", "0123456789", "amount", 10_000, "content", "an trua"))
                .andExpect(jsonPath("$.status").value("UNMATCHED"));
        send(get("/api/v1/fee-notices/{id}", id), null).andExpect(jsonPath("$.summary.status").value("PAID"))
                .andExpect(jsonPath("$.payments.length()").value(2))
                .andExpect(jsonPath("$.payments[1].method").value("VIETQR"));
        assertThat(transactionRepository.findById(laundry.getId()).orElseThrow().getStatus())
                .isEqualTo(FinancialTransaction.Status.PAID);
        send(get("/api/v1/bank-transactions"), null).andExpect(jsonPath("$.totalElements").value(2));

        // Huỷ phiếu tiền mặt → thu thiếu lại, khoản giặt là về chưa thanh toán; thông báo có phiếu thì không huỷ được.
        send(post("/api/v1/payments/{id}/cancel", cash.get("id").asLong()), Map.of("reason", "Thu nhầm căn",
                "version", cash.get("version").asLong())).andExpect(jsonPath("$.status").value("CANCELLED"));
        n = json(send(get("/api/v1/fee-notices/{id}", id), null).andExpect(jsonPath("$.summary.status").value("PARTIAL"))
                .andExpect(jsonPath("$.summary.outstanding").value(400000)));
        assertThat(transactionRepository.findById(laundry.getId()).orElseThrow().getStatus())
                .isEqualTo(FinancialTransaction.Status.PENDING);
        send(post("/api/v1/fee-notices/{id}/cancel", id), Map.of("reason", "Sai", "version",
                n.get("summary").get("version").asLong())).andExpect(status().isConflict());

        // Kỳ sau: nợ 400.000 chuyển thành "Nợ kỳ trước"; phát hành thì thông báo cũ hết nhận thanh toán.
        send(delete("/api/v1/fee-notices/{id}", a2Notice), null).andExpect(status().isNoContent());
        send(post("/api/v1/fee-notices/generate"), Map.of("period", current, "apartmentIds", List.of(a1.getId())))
                .andExpect(jsonPath("$.created").value(1));
        JsonNode next = json(send(get("/api/v1/fee-notices?period={p}&apartmentId={a}", current, a1.getId()), null))
                .get("content").get(0);
        JsonNode detail = json(send(get("/api/v1/fee-notices/{id}", next.get("id").asLong()), null));
        assertThat(detail.get("items").findValuesAsText("type")).contains("PREVIOUS_DEBT").doesNotContain("SERVICE");
        send(post("/api/v1/fee-notices/issue-all"), Map.of("period", current)).andExpect(jsonPath("$.issued").value(1));
        send(get("/api/v1/fee-notices/{id}", id), null).andExpect(jsonPath("$.summary.outstanding").value(0))
                .andExpect(jsonPath("$.summary.carriedToCode").value(next.get("code").asText()));
        send(post("/api/v1/payments"), Map.of("feeNoticeId", id, "amount", 1000, "method", "CASH"))
                .andExpect(status().isConflict());
        send(get("/api/v1/fee-notices?unpaid=true"), null).andExpect(jsonPath("$.totalElements").value(1));
        send(get("/api/v1/dashboard?month={m}", current), null).andExpect(jsonPath("$.feeDebt").isNumber())
                .andExpect(jsonPath("$.feeByPeriod.length()").value(6));
        send(get("/api/v1/fee-notices/export?period={p}", period), null).andExpect(status().isOk());
    }

    @Test
    void overdueJobAndBuildingIsolation() throws Exception {
        send(post("/api/v1/meter-readings"), reading(a1, period, "ELECTRIC", "0", "10")).andExpect(status().isCreated());
        send(post("/api/v1/fee-notices/generate"), Map.of("period", period, "apartmentIds", List.of(a1.getId()),
                "dueDate", LocalDate.now().plusDays(3).toString())).andExpect(status().isCreated());
        FeeNotice n = feeNoticeRepository.findAll().stream().filter(x -> x.getApartmentId().equals(a1.getId()))
                .findFirst().orElseThrow();
        send(post("/api/v1/fee-notices/{id}/issue", n.getId()), Map.of("version", n.getVersion()))
                .andExpect(jsonPath("$.summary.status").value("ISSUED"));
        n = feeNoticeRepository.findById(n.getId()).orElseThrow();
        n.setDueDate(LocalDate.now().minusDays(1));
        feeNoticeRepository.saveAndFlush(n);
        assertThat(feeNoticeService.markOverdue()).isPositive();
        send(get("/api/v1/fee-notices/{id}", n.getId()), null).andExpect(jsonPath("$.summary.status").value("OVERDUE"));

        Building other = createBuilding();
        String outsider = login(createUser(unique("bql"), Set.of(other.getId()), "BUILDING_MANAGER").getUsername());
        mvc.perform(get("/api/v1/fee-notices/{id}", n.getId()).header(HttpHeaders.AUTHORIZATION, bearer(outsider)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/payments").header(HttpHeaders.AUTHORIZATION, bearer(outsider))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("feeNoticeId", n.getId(), "amount", 1000, "method", "CASH"))))
                .andExpect(status().isNotFound());
        String staff = login(createUser(unique("nv"), Set.of(tower.getId()), "STAFF").getUsername());
        mvc.perform(get("/api/v1/fee-notices").header(HttpHeaders.AUTHORIZATION, bearer(staff)))
                .andExpect(status().isForbidden());
    }

    private static Map<String, Object> rates() {
        return Map.of("vatPercent", 10, "dueDay", 15,
                "managementRates", List.of(Map.of("apartmentType", "APARTMENT", "unitPrice", 7000)),
                "electricTiers", List.of(Map.of("upTo", 50, "unitPrice", 1800), Map.of("unitPrice", 2000)),
                "waterTiers", List.of(Map.of("unitPrice", 15000)),
                "otherCharges", List.of(Map.of("name", "Phí vệ sinh", "amount", 30000)));
    }

    private static Map<String, Object> reading(Apartment a, String period, String type, String oldIndex, String newIndex) {
        Map<String, Object> m = new HashMap<>(Map.of("apartmentId", a.getId(), "period", period, "meterType", type,
                "newIndex", new BigDecimal(newIndex)));
        if (oldIndex != null) {
            m.put("oldIndex", new BigDecimal(oldIndex));
        }
        return m;
    }

    private static Map<String, Object> update(String oldIndex, String newIndex, long version) {
        Map<String, Object> m = new HashMap<>(Map.of("newIndex", new BigDecimal(newIndex), "version", version));
        if (oldIndex != null) {
            m.put("oldIndex", new BigDecimal(oldIndex));
        }
        return m;
    }

    private static Map<String, Object> item(JsonNode i) {
        Map<String, Object> m = new HashMap<>();
        m.put("type", i.get("type").asText());
        m.put("description", i.get("description").asText());
        m.put("amount", i.get("amount").decimalValue());
        if (i.hasNonNull("quantity")) {
            m.put("quantity", i.get("quantity").decimalValue());
        }
        if (i.hasNonNull("unitPrice")) {
            m.put("unitPrice", i.get("unitPrice").decimalValue());
        }
        if (i.hasNonNull("sourceRef")) {
            m.put("sourceRef", i.get("sourceRef").asText());
        }
        return m;
    }

    private ResultActions webhook(Map<String, Object> event) throws Exception {
        return mvc.perform(post("/api/v1/webhooks/bank").header("X-Webhook-Secret", WEBHOOK_SECRET)
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(event)));
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
