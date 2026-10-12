package com.bihome.apartment;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.apartment.ApartmentEnums.Labeled;
import com.bihome.apartment.ApartmentEnums.OwnershipType;
import com.bihome.apartment.ApartmentEnums.UsageStatus;
import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.excel.ExcelReader.ExcelRow;
import com.bihome.common.excel.ExcelWriter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.Sheet;

/** Định dạng file Excel nhập/xuất căn hộ. Ô Loại/Hình thức/... nhận nhãn tiếng Việt hoặc mã (vd "Căn hộ" hoặc APARTMENT). */
final class ApartmentExcel {

    static final String CODE = "Mã căn hộ";
    static final String NAME = "Tên căn hộ";
    static final String FLOOR = "Tầng";
    static final String AREA = "Diện tích (m²)";
    static final String TYPE = "Loại";
    static final String OWNERSHIP = "Hình thức";
    static final String USAGE = "Tình trạng sử dụng";
    static final String BEDROOMS = "Số phòng ngủ";
    static final String ROOMS = "Số phòng";
    static final String STATUS = "Trạng thái";
    static final String DESCRIPTION = "Mô tả";

    static final List<String> REQUIRED = List.of(CODE, NAME, FLOOR, AREA, TYPE, OWNERSHIP);
    private static final List<String> TEMPLATE_HEADERS = List.of(CODE + " *", NAME + " *", FLOOR + " *", AREA + " *",
            TYPE + " *", OWNERSHIP + " *", USAGE, BEDROOMS, ROOMS, STATUS, DESCRIPTION);
    private static final Map<ActiveStatus, String> STATUS_LABELS =
            Map.of(ActiveStatus.ACTIVE, "Hoạt động", ActiveStatus.INACTIVE, "Không hoạt động");

    private ApartmentExcel() {
    }

    static byte[] template() {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet data = excel.sheet("Căn hộ", TEMPLATE_HEADERS);
            excel.row(data, List.of("A1205", "A-12.05", "12", 75.5, "Căn hộ", "Sở hữu", "Đang ở", 2, 4, "Hoạt động", ""));
            excel.row(data, List.of("SH01", "Shophouse SH-01", "1", 120, "Shophouse", "Cho thuê", "Trống", 0, 2, "Hoạt động",
                    "Mặt tiền đường chính"));
            Sheet guide = excel.sheet("Hướng dẫn", List.of("Cột", "Giá trị hợp lệ"));
            excel.row(guide, List.of(CODE, "Bắt buộc, duy nhất trong tòa nhà; chữ không dấu, chữ số, . _ -"));
            excel.row(guide, List.of(FLOOR, "Bắt buộc, vd 12, 12A, B1"));
            excel.row(guide, List.of(AREA, "Bắt buộc, số dương, tối đa 2 chữ số thập phân"));
            excel.row(guide, List.of(TYPE, labels(ApartmentType.values())));
            excel.row(guide, List.of(OWNERSHIP, labels(OwnershipType.values())));
            excel.row(guide, List.of(USAGE, labels(UsageStatus.values()) + " (bỏ trống = Trống)"));
            excel.row(guide, List.of(STATUS, "Hoạt động, Không hoạt động (bỏ trống = Hoạt động)"));
            excel.row(guide, List.of("Ghi chú", "Căn hộ được nhập vào tòa nhà đang chọn trên hệ thống; dòng trống bị bỏ qua."));
            return excel.toBytes();
        }
    }

    /** @param owners tên chủ sở hữu theo id căn hộ */
    static byte[] export(List<Apartment> apartments, Map<Long, String> owners) {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Căn hộ", List.of("Tòa nhà", CODE, NAME, FLOOR, AREA, TYPE, OWNERSHIP, USAGE,
                    BEDROOMS, ROOMS, "Chủ sở hữu", "Thành viên", STATUS, DESCRIPTION, "Ngày tạo", "Ngày cập nhật"));
            for (Apartment a : apartments) {
                excel.row(sheet, Arrays.asList(a.getBuilding().getName(), a.getCode(), a.getName(), a.getFloorNo(),
                        a.getArea(), a.getType().label(), a.getOwnershipType().label(), a.getUsageStatus().label(),
                        a.getBedrooms(), a.getRooms(), owners.get(a.getId()), a.getMemberCount(),
                        STATUS_LABELS.get(a.getStatus()), a.getDescription(), a.getCreatedAt(), a.getUpdatedAt()));
            }
            return excel.toBytes();
        }
    }

    /** Lỗi định dạng ô (không phải lỗi ràng buộc) – trả thông điệp tiếng Việt cho dòng đó. */
    static final class CellException extends RuntimeException {
        CellException(String message) {
            super(message);
        }
    }

    /** Chuyển một dòng thành request; buildingId để trống (service gán tòa đang chọn). */
    static ApartmentDtos.Request parse(ExcelRow row) {
        List<String> errors = new ArrayList<>();
        BigDecimal area = parse(errors, () -> decimal(row.get(AREA), AREA));
        Integer bedrooms = parse(errors, () -> integer(row.get(BEDROOMS), BEDROOMS));
        Integer rooms = parse(errors, () -> integer(row.get(ROOMS), ROOMS));
        ApartmentType type = parse(errors, () -> labeled(ApartmentType.values(), row.get(TYPE), TYPE, null));
        OwnershipType ownership = parse(errors, () -> labeled(OwnershipType.values(), row.get(OWNERSHIP), OWNERSHIP, null));
        UsageStatus usage = parse(errors, () -> labeled(UsageStatus.values(), row.get(USAGE), USAGE, UsageStatus.VACANT));
        ActiveStatus status = parse(errors, () -> activeStatus(row.get(STATUS)));
        if (!errors.isEmpty()) {
            throw new CellException(String.join("; ", errors));
        }
        return new ApartmentDtos.Request(null, row.get(CODE), row.get(NAME), row.get(FLOOR), bedrooms, rooms, area,
                type, ownership, usage, blankToNull(row.get(DESCRIPTION)), status, List.of(), null);
    }

    private interface CellParser<T> {
        T parse();
    }

    private static <T> T parse(List<String> errors, CellParser<T> parser) {
        try {
            return parser.parse();
        } catch (CellException e) {
            errors.add(e.getMessage());
            return null;
        }
    }

    private static BigDecimal decimal(String value, String column) {
        if (value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.replace(',', '.').replace(" ", ""));
        } catch (NumberFormatException e) {
            throw new CellException(column + " không phải là số");
        }
    }

    private static Integer integer(String value, String column) {
        if (value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.replace(',', '.')).intValueExact();
        } catch (NumberFormatException | ArithmeticException e) {
            throw new CellException(column + " phải là số nguyên");
        }
    }

    private static <E extends Enum<E> & Labeled> E labeled(E[] values, String value, String column, E fallback) {
        if (value.isBlank()) {
            return fallback;
        }
        for (E e : values) {
            if (e.label().equalsIgnoreCase(value) || e.name().equalsIgnoreCase(value)) {
                return e;
            }
        }
        throw new CellException(column + " \"" + value + "\" không hợp lệ (chọn: " + labels(values) + ")");
    }

    private static ActiveStatus activeStatus(String value) {
        if (value.isBlank()) {
            return ActiveStatus.ACTIVE;
        }
        for (Map.Entry<ActiveStatus, String> e : STATUS_LABELS.entrySet()) {
            if (e.getValue().equalsIgnoreCase(value) || e.getKey().name().equalsIgnoreCase(value)) {
                return e.getKey();
            }
        }
        throw new CellException(STATUS + " \"" + value + "\" không hợp lệ (chọn: Hoạt động, Không hoạt động)");
    }

    private static <E extends Labeled> String labels(E[] values) {
        return Arrays.stream(values).map(Labeled::label).collect(Collectors.joining(", "));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    static String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }
}
