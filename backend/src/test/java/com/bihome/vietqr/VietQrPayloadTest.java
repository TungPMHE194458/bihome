package com.bihome.vietqr;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class VietQrPayloadTest {

    @Test
    void crcMatchesCcittFalseCheckValue() {
        assertThat(VietQrPayload.crc16("123456789")).isEqualTo("29B1");
    }

    @Test
    void buildsDynamicEmvCoPayloadWithAmountAndContent() {
        String payload = VietQrPayload.build("970436", "0123456789", new BigDecimal("1150000"), "BIHOME TB-261011-001");

        assertThat(payload).startsWith("000201" + "010212")
                .contains("38540010A00000072701240006970436011001234567890208QRIBFTTA")
                .contains("5303704")
                .contains("54071150000")
                .contains("5802VN")
                .contains("62240820BIHOME TB-261011-001")
                .contains("6304");
        String body = payload.substring(0, payload.length() - 4);
        assertThat(payload.substring(payload.length() - 4)).isEqualTo(VietQrPayload.crc16(body));
    }

    @Test
    void staticPayloadWithoutAmount() {
        String payload = VietQrPayload.build("970422", "MB12345", null, null);
        assertThat(payload).contains("010211").doesNotContain("5406").doesNotContain("6224");
    }

    @Test
    void sanitizesTransferContent() {
        assertThat(VietQrPayload.sanitize("Bihome  thanh toán phí, căn A-01.02!")).isEqualTo("BIHOME THANH TOAN PHI CAN A-01 02");
        assertThat(VietQrPayload.sanitize("x".repeat(80))).hasSize(VietQrPayload.MAX_CONTENT);
    }

    @Test
    void extractsNoticeCodeWhenBanksDropSeparators() {
        assertThat(BankWebhookService.extractCode("BIHOME TB-261011-001")).hasValue("TB-261011-001");
        assertThat(BankWebhookService.extractCode("MBVCB.123.bihome tb261011001.CT tu 0123")).hasValue("TB-261011-001");
        assertThat(BankWebhookService.extractCode("TB 261011 1024 thanh toan")).hasValue("TB-261011-1024");
        assertThat(BankWebhookService.extractCode("chuyen tien an trua")).isEmpty();
    }
}
