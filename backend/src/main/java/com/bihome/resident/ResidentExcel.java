package com.bihome.resident;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentEnums.Labeled;
import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ExcelReader.ExcelRow;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.resident.ResidentEnums.IdDocumentType;
import com.bihome.resident.ResidentEnums.Relationship;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.resident.dto.ResidentDtos;
import com.bihome.user.Gender;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.Sheet;

/**
 * Định dạng file Excel nhập/xuất cư dân. Mỗi dòng nhập = một cư dân mới gắn với một căn hộ trong tòa đang chọn.
 * Ô dạng lựa chọn nhận nhãn tiếng Việt hoặc mã (vd "Chủ sở hữu" hoặc OWNER).
 */
final class ResidentExcel {

    static final String CODE = "Mã cư dân";
    static final String FULL_NAME = "Họ và tên";
    static final String PHONE = "Số điện thoại";
    static final String EMAIL = "Email";
    static final String GENDER = "Giới tính";
    static final String DATE_OF_BIRTH = "Ngày sinh";
    static final String ID_TYPE = "Loại giấy tờ";
    static final String ID_NUMBER = "Số giấy tờ";
    static final String ID_ISSUE_DATE = "Ngày cấp";
    static final String ID_ISSUE_PLACE = "Nơi cấp";
    static final String NATIONALITY = "Quốc tịch";
    static final String APARTMENT = "Mã căn hộ";
    static final String ROLE = "Vai trò tại căn hộ";
    static final String RELATIONSHIP = "Quan hệ với chủ hộ";
    static final String HEAD = "Chủ hộ chính";
    static final String MOVE_IN = "Ngày chuyển đến";
    static final String TEMP_RESIDENCE = "Đăng ký tạm trú";
    static final String NOTE = "Ghi chú";

    static final List<String> REQUIRED = List.of(FULL_NAME, PHONE, APARTMENT, ROLE, MOVE_IN);
    private static final List<String> TEMPLATE_HEADERS = List.of(CODE, FULL_NAME + " *", PHONE + " *", EMAIL, GENDER,
            DATE_OF_BIRTH, ID_TYPE, ID_NUMBER, ID_ISSUE_DATE, ID_ISSUE_PLACE, NATIONALITY, APARTMENT + " *", ROLE + " *",
            RELATIONSHIP, HEAD, MOVE_IN + " *", TEMP_RESIDENCE, NOTE);
    private static final Map<Gender, String> GENDER_LABELS =
            Map.of(Gender.MALE, "Nam", Gender.FEMALE, "Nữ", Gender.OTHER, "Khác");
    private static final Set<String> YES = Set.of("có", "x", "yes", "true", "1");
    private static final Set<String> NO = Set.of("không", "chưa", "no", "false", "0");

    private ResidentExcel() {
    }

    static byte[] template() {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet data = excel.sheet("Cư dân", TEMPLATE_HEADERS);
            excel.row(data, List.of("", "Nguyễn Văn An", "0912345678", "an.nguyen@example.com", "Nam", "15/04/1985",
                    "CCCD", "001085012345", "10/06/2021", "Cục Cảnh sát QLHC về TTXH", "Việt Nam", "A0101",
                    "Chủ sở hữu", "", "Có", "01/03/2024", "Có", ""));
            excel.row(data, List.of("", "Trần Thị Bình", "0987654321", "", "Nữ", "20/08/1988", "", "", "", "", "",
                    "A0101", "Thành viên gia đình", "Vợ/Chồng", "", "01/03/2024", "Có", ""));
            Sheet guide = excel.sheet("Hướng dẫn", List.of("Cột", "Giá trị hợp lệ"));
            excel.row(guide, List.of(CODE, "Bỏ trống = tự sinh CD + 6 số; nếu nhập phải duy nhất trong tòa nhà"));
            excel.row(guide, List.of(PHONE, "Bắt buộc, số di động Việt Nam (0xxxxxxxxx hoặc +84...), duy nhất trong tòa"));
            excel.row(guide, List.of(GENDER, String.join(", ", GENDER_LABELS.values())));
            excel.row(guide, List.of("Ngày", "Định dạng dd/MM/yyyy (vd 01/03/2024)"));
            excel.row(guide, List.of(ID_TYPE, labels(IdDocumentType.values())));
            excel.row(guide, List.of(ID_NUMBER, "CCCD 12 chữ số; hộ chiếu 6–9 chữ cái/chữ số. Nên định dạng ô là Text "
                    + "để Excel không bỏ số 0 ở đầu"));
            excel.row(guide, List.of(NATIONALITY, "Bỏ trống = Việt Nam"));
            excel.row(guide, List.of(APARTMENT, "Bắt buộc, mã căn hộ đang hoạt động trong tòa nhà đang chọn"));
            excel.row(guide, List.of(ROLE, labels(ResidentRole.values())));
            excel.row(guide, List.of(RELATIONSHIP, labels(Relationship.values())));
            excel.row(guide, List.of(HEAD, "Có / bỏ trống; chỉ vai trò Chủ sở hữu, mỗi căn tối đa một chủ hộ chính"));
            excel.row(guide, List.of(TEMP_RESIDENCE, "Có / Chưa (bỏ trống = Chưa)"));
            excel.row(guide, List.of("Ghi chú", "Cư dân được nhập vào tòa nhà đang chọn trên hệ thống; dòng trống bị bỏ qua."));
            return excel.toBytes();
        }
    }

    /** Số giấy tờ đã che bớt; cột "Căn hộ" chỉ gồm các căn đang ở. */
    static byte[] export(List<Resident> residents) {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Cư dân", List.of("Tòa nhà", CODE, FULL_NAME, PHONE, EMAIL, GENDER, DATE_OF_BIRTH,
                    ID_TYPE, ID_NUMBER, ID_ISSUE_DATE, ID_ISSUE_PLACE, NATIONALITY, "Căn hộ", "Tình trạng cư trú",
                    TEMP_RESIDENCE, "Tài khoản app", NOTE, "Ngày tạo", "Ngày cập nhật"));
            for (Resident r : residents) {
                List<ApartmentResident> active = r.activeLinks();
                boolean temp = active.stream().anyMatch(ApartmentResident::isTempResidenceRegistered);
                excel.row(sheet, Arrays.asList(r.getBuilding().getName(), r.getCode(), r.getFullName(), r.getPhone(),
                        r.getEmail(), r.getGender() == null ? null : GENDER_LABELS.get(r.getGender()),
                        r.getDateOfBirth(), r.getIdType() == null ? null : r.getIdType().label(),
                        IdNumbers.mask(r.getIdNumber()), r.getIdIssueDate(), r.getIdIssuePlace(), r.getNationality(),
                        active.stream().map(ResidentExcel::describe).collect(Collectors.joining("; ")),
                        r.overallStatus().label(), temp ? "Có" : "Chưa", r.getAppAccountStatus().label(), r.getNote(),
                        r.getCreatedAt(), r.getUpdatedAt()));
            }
            return excel.toBytes();
        }
    }

    private static String describe(ApartmentResident link) {
        return link.getApartment().getCode() + " – " + link.getRole().label() + (link.isHouseholdHead() ? " (chủ hộ)" : "");
    }

    /** Lỗi định dạng ô (không phải lỗi ràng buộc) – trả thông điệp tiếng Việt cho dòng đó. */
    static final class CellException extends RuntimeException {
        CellException(String message) {
            super(message);
        }
    }

    /** @param apartments căn hộ của tòa đang chọn theo mã (đã in hoa) */
    static ResidentDtos.Request parse(ExcelRow row, Map<String, Apartment> apartments) {
        List<String> errors = new ArrayList<>();
        Gender gender = parse(errors, () -> gender(row.get(GENDER)));
        LocalDate dateOfBirth = parse(errors, () -> date(row.get(DATE_OF_BIRTH), DATE_OF_BIRTH));
        IdDocumentType idType = parse(errors, () -> labeled(IdDocumentType.values(), row.get(ID_TYPE), ID_TYPE));
        LocalDate idIssueDate = parse(errors, () -> date(row.get(ID_ISSUE_DATE), ID_ISSUE_DATE));
        Apartment apartment = parse(errors, () -> apartment(row.get(APARTMENT), apartments));
        ResidentRole role = parse(errors, () -> labeled(ResidentRole.values(), row.get(ROLE), ROLE));
        Relationship relationship = parse(errors, () -> labeled(Relationship.values(), row.get(RELATIONSHIP), RELATIONSHIP));
        Boolean head = parse(errors, () -> yesNo(row.get(HEAD), HEAD));
        LocalDate moveIn = parse(errors, () -> date(row.get(MOVE_IN), MOVE_IN));
        Boolean temp = parse(errors, () -> yesNo(row.get(TEMP_RESIDENCE), TEMP_RESIDENCE));
        if (!errors.isEmpty()) {
            throw new CellException(String.join("; ", errors));
        }
        String idNumber = idNumber(row.get(ID_NUMBER), idType);
        ResidentDtos.LinkRequest link = new ResidentDtos.LinkRequest(apartment == null ? null : apartment.getId(),
                role, relationship, Boolean.TRUE.equals(head), moveIn, null, ResidenceStatus.LIVING,
                Boolean.TRUE.equals(temp), null);
        return new ResidentDtos.Request(row.get(CODE), row.get(FULL_NAME), phone(row.get(PHONE)),
                blankToNull(row.get(EMAIL)), gender, dateOfBirth, idType, idNumber, idIssueDate,
                blankToNull(row.get(ID_ISSUE_PLACE)), blankToNull(row.get(NATIONALITY)), null,
                blankToNull(row.get(NOTE)), link, null);
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

    private static Apartment apartment(String code, Map<String, Apartment> apartments) {
        String normalized = normalizeCode(code);
        if (normalized.isEmpty()) {
            return null; // để Bean Validation báo "Vui lòng chọn căn hộ"
        }
        Apartment apartment = apartments.get(normalized);
        if (apartment == null) {
            throw new CellException("Không có căn hộ mã \"" + code.trim() + "\" trong tòa nhà");
        }
        return apartment;
    }

    private static LocalDate date(String value, String column) {
        try {
            return ExcelReader.parseDate(value);
        } catch (IllegalArgumentException e) {
            throw new CellException(column + " \"" + value + "\" không đúng định dạng dd/MM/yyyy");
        }
    }

    private static Gender gender(String value) {
        if (value.isBlank()) {
            return null;
        }
        for (Map.Entry<Gender, String> e : GENDER_LABELS.entrySet()) {
            if (e.getValue().equalsIgnoreCase(value) || e.getKey().name().equalsIgnoreCase(value)) {
                return e.getKey();
            }
        }
        throw new CellException(GENDER + " \"" + value + "\" không hợp lệ (chọn: Nam, Nữ, Khác)");
    }

    private static Boolean yesNo(String value, String column) {
        String v = value.trim().toLowerCase(Locale.ROOT);
        if (v.isEmpty() || NO.contains(v)) {
            return false;
        }
        if (YES.contains(v)) {
            return true;
        }
        throw new CellException(column + " \"" + value + "\" không hợp lệ (chọn: Có, Không)");
    }

    private static <E extends Enum<E> & Labeled> E labeled(E[] values, String value, String column) {
        if (value.isBlank()) {
            return null;
        }
        for (E e : values) {
            if (e.label().equalsIgnoreCase(value) || e.name().equalsIgnoreCase(value)) {
                return e;
            }
        }
        throw new CellException(column + " \"" + value + "\" không hợp lệ (chọn: " + labels(values) + ")");
    }

    /** Ô số bị Excel bỏ số 0 đầu: 912345678 → 0912345678. */
    private static String phone(String value) {
        String v = value.replace(" ", "");
        return v.matches("^[35789]\\d{8}$") ? "0" + v : v;
    }

    /** Ô số bị Excel bỏ số 0 đầu của CCCD (mã tỉnh 001–096): bù lại cho đủ 12 chữ số. */
    private static String idNumber(String value, IdDocumentType type) {
        String v = IdNumbers.normalize(value);
        if (v != null && type == IdDocumentType.CCCD && v.matches("^\\d{10,11}$")) {
            return "0".repeat(12 - v.length()) + v;
        }
        return v;
    }

    private static <E extends Labeled> String labels(E[] values) {
        return Arrays.stream(values).map(Labeled::label).collect(Collectors.joining(", "));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    static String normalizeCode(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }
}
