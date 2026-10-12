package com.bihome.meter;

import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.meter.MeterReading.MeterType;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import org.apache.poi.ss.usermodel.Sheet;

/** File mẫu và đọc dòng Excel nhập số liệu (kỳ chọn trên màn hình, không nằm trong file). */
final class MeterReadingExcel {

    static final String CODE = "Mã căn hộ";
    static final String TYPE = "Loại đồng hồ";
    static final String NEW_INDEX = "Chỉ số mới";
    static final String OLD_INDEX = "Chỉ số cũ";
    static final String NOTE = "Ghi chú";

    static final List<String> REQUIRED = List.of(CODE, TYPE, NEW_INDEX);
    private static final BigDecimal MAX_INDEX = new BigDecimal("9999999999");

    private MeterReadingExcel() {
    }

    record Parsed(int rowNumber, String key, String apartmentCode, MeterType meterType, BigDecimal oldIndex,
                  BigDecimal newIndex, String note, String error) {
    }

    static byte[] template() {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet data = excel.sheet("Số liệu", List.of(CODE + " *", TYPE + " *", NEW_INDEX + " *", OLD_INDEX, NOTE));
            excel.row(data, List.of("A0101", "Điện", 1450, "", ""));
            excel.row(data, List.of("A0101", "Nước", 236.5, "", ""));
            Sheet guide = excel.sheet("Hướng dẫn", List.of("Cột", "Giá trị hợp lệ"));
            excel.row(guide, List.of(CODE, "Bắt buộc, mã căn hộ của tòa nhà đang chọn"));
            excel.row(guide, List.of(TYPE, "Điện hoặc Nước"));
            excel.row(guide, List.of(NEW_INDEX, "Bắt buộc, số không âm, tối đa 2 chữ số thập phân"));
            excel.row(guide, List.of(OLD_INDEX, "Chỉ dùng cho kỳ đầu tiên của đồng hồ; có kỳ trước thì lấy chỉ số mới kỳ trước"));
            excel.row(guide, List.of("Ghi chú", "Kỳ chọn trên màn hình nhập; căn đã có số liệu kỳ đó thì được cập nhật."));
            return excel.toBytes();
        }
    }

    static Parsed parse(ExcelReader.ExcelRow row) {
        String code = row.get(CODE).trim().toUpperCase(Locale.ROOT);
        String typeText = row.get(TYPE).trim();
        String key = code.isEmpty() ? "Dòng " + row.rowNumber() : code + " · " + typeText;
        String note = row.get(NOTE).trim();
        note = note.isEmpty() ? null : note.length() > 500 ? note.substring(0, 500) : note;
        if (code.isEmpty()) {
            return error(row, key, "Thiếu mã căn hộ.");
        }
        MeterType type = type(typeText);
        if (type == null) {
            return error(row, key, "Loại đồng hồ phải là Điện hoặc Nước.");
        }
        BigDecimal newIndex;
        BigDecimal oldIndex;
        try {
            newIndex = number(row.get(NEW_INDEX));
            oldIndex = number(row.get(OLD_INDEX));
        } catch (NumberFormatException e) {
            return error(row, key, "Chỉ số phải là số không âm, tối đa 2 chữ số thập phân.");
        }
        if (newIndex == null) {
            return error(row, key, "Thiếu chỉ số mới.");
        }
        return new Parsed(row.rowNumber(), key, code, type, oldIndex, newIndex, note, null);
    }

    private static Parsed error(ExcelReader.ExcelRow row, String key, String message) {
        return new Parsed(row.rowNumber(), key, null, null, null, null, null, message);
    }

    private static MeterType type(String text) {
        String t = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").replace('đ', 'd')
                .replace('Đ', 'D').toUpperCase(Locale.ROOT);
        return switch (t) {
            case "DIEN", "ELECTRIC" -> MeterType.ELECTRIC;
            case "NUOC", "WATER" -> MeterType.WATER;
            default -> null;
        };
    }

    private static BigDecimal number(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        BigDecimal v = new BigDecimal(text.trim().replace(",", "."));
        if (v.signum() < 0 || v.scale() > 2 || v.compareTo(MAX_INDEX) > 0) {
            throw new NumberFormatException(text);
        }
        return v;
    }
}
