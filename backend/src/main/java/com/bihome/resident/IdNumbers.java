package com.bihome.resident;

import com.bihome.resident.ResidentEnums.IdDocumentType;
import java.util.Locale;
import java.util.regex.Pattern;

/** Số giấy tờ tuỳ thân: kiểm tra định dạng và che bớt khi hiển thị ở danh sách / file xuất. */
final class IdNumbers {

    private static final Pattern CCCD = Pattern.compile("^\\d{12}$");
    private static final Pattern PASSPORT = Pattern.compile("^[A-Z0-9]{6,9}$");

    private IdNumbers() {
    }

    static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.replaceAll("\\s", "").toUpperCase(Locale.ROOT);
    }

    /** @return thông báo lỗi, hoặc null nếu hợp lệ */
    static String validate(IdDocumentType type, String number) {
        if (number == null) {
            return null;
        }
        if (type == null) {
            return "Vui lòng chọn loại giấy tờ";
        }
        return switch (type) {
            case CCCD -> CCCD.matcher(number).matches() ? null : "Số CCCD gồm 12 chữ số";
            case PASSPORT -> PASSPORT.matcher(number).matches() ? null : "Số hộ chiếu gồm 6–9 chữ cái hoặc chữ số";
        };
    }

    /** "001099012123" → "0010*****123": giữ 4 ký tự đầu và 3 ký tự cuối. */
    static String mask(String number) {
        if (number == null) {
            return null;
        }
        if (number.length() <= 7) {
            return "*".repeat(Math.max(0, number.length() - 2)) + number.substring(Math.max(0, number.length() - 2));
        }
        return number.substring(0, 4) + "*".repeat(number.length() - 7) + number.substring(number.length() - 3);
    }
}
