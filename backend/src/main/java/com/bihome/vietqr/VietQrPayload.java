package com.bihome.vietqr;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;

/**
 * Chuỗi QR chuyển khoản theo chuẩn EMVCo / VietQR (NAPAS), tự sinh ở backend không gọi API ngoài:
 * {@code 00} phiên bản, {@code 01} 11 tĩnh / 12 động (có số tiền), {@code 38} tài khoản thụ hưởng (GUID NAPAS
 * {@code A000000727}, BIN + số tài khoản, dịch vụ {@code QRIBFTTA} chuyển tới tài khoản), {@code 53} 704 (VND),
 * {@code 54} số tiền, {@code 58} VN, {@code 62.08} nội dung, {@code 63} CRC16-CCITT (0xFFFF, đa thức 0x1021).
 */
public final class VietQrPayload {

    static final String NAPAS_GUID = "A000000727";
    static final String SERVICE_TO_ACCOUNT = "QRIBFTTA";
    /** Nhiều ngân hàng chỉ giữ ~50 ký tự nội dung chuyển khoản. */
    public static final int MAX_CONTENT = 50;

    private VietQrPayload() {
    }

    public static String build(String bankBin, String accountNo, BigDecimal amount, String content) {
        String beneficiary = tlv("00", bankBin) + tlv("01", accountNo);
        String merchant = tlv("00", NAPAS_GUID) + tlv("01", beneficiary) + tlv("02", SERVICE_TO_ACCOUNT);
        boolean dynamic = amount != null && amount.signum() > 0;
        StringBuilder sb = new StringBuilder()
                .append(tlv("00", "01"))
                .append(tlv("01", dynamic ? "12" : "11"))
                .append(tlv("38", merchant))
                .append(tlv("53", "704"));
        if (dynamic) {
            sb.append(tlv("54", amount.setScale(0, RoundingMode.HALF_UP).toPlainString()));
        }
        sb.append(tlv("58", "VN"));
        String text = content == null ? "" : sanitize(content);
        if (!text.isEmpty()) {
            sb.append(tlv("62", tlv("08", text)));
        }
        sb.append("6304");
        return sb.append(crc16(sb.toString())).toString();
    }

    /** Nội dung chuyển khoản: bỏ dấu, chỉ giữ chữ, số, khoảng trắng và gạch nối, viết hoa, tối đa 50 ký tự. */
    public static String sanitize(String text) {
        String s = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9 \\-]", " ").replaceAll("\\s+", " ").trim();
        return s.length() > MAX_CONTENT ? s.substring(0, MAX_CONTENT).trim() : s;
    }

    static String tlv(String id, String value) {
        if (value.length() > 99) {
            throw new IllegalArgumentException("Giá trị trường " + id + " vượt 99 ký tự");
        }
        return id + "%02d".formatted(value.length()) + value;
    }

    /** CRC-16/CCITT-FALSE, 4 chữ số hex in hoa. */
    static String crc16(String data) {
        int crc = 0xFFFF;
        for (byte b : data.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return "%04X".formatted(crc);
    }
}
