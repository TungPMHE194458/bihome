package com.bihome.common.excel;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.storage.DetectedFileType;
import com.bihome.common.storage.FileTypeDetector;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.web.multipart.MultipartFile;

/** Đọc sheet đầu tiên theo hàng tiêu đề của file mẫu; bỏ qua dòng trống. Giá trị trả về là chuỗi đã trim. */
public final class ExcelReader {

    public static final int MAX_ROWS = 5000;

    private ExcelReader() {
    }

    /** Một dòng dữ liệu; {@code rowNumber} là số dòng hiển thị trong Excel (dòng tiêu đề là 1). */
    public record ExcelRow(int rowNumber, Map<String, String> values) {

        public String get(String header) {
            return values.getOrDefault(normalize(header), "");
        }
    }

    /** Nội dung file tải lên, chỉ nhận .xlsx (kiểm tra theo nội dung, không chỉ phần mở rộng). */
    public static byte[] requireXlsx(MultipartFile file) {
        try {
            byte[] data = file == null ? new byte[0] : file.getBytes();
            boolean xlsx = FileTypeDetector.detect(data, file == null ? null : file.getOriginalFilename())
                    .filter(t -> t == DetectedFileType.XLSX).isPresent();
            if (!xlsx) {
                throw new BusinessException(ErrorCode.FILE_TYPE_NOT_ALLOWED, "Chỉ nhận file Excel (.xlsx) theo mẫu.");
            }
            return data;
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.STORAGE_ERROR, "Không đọc được file tải lên.", e);
        }
    }

    public static List<ExcelRow> read(InputStream in, List<String> requiredHeaders) {
        DataFormatter formatter = new DataFormatter(Locale.ROOT);
        try (Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                throw invalid("File không có dữ liệu.");
            }
            Map<Integer, String> columns = new HashMap<>();
            for (Cell cell : headerRow) {
                String header = normalize(formatter.formatCellValue(cell));
                if (!header.isEmpty()) {
                    columns.put(cell.getColumnIndex(), header);
                }
            }
            List<String> missing = requiredHeaders.stream().filter(h -> !columns.containsValue(normalize(h))).toList();
            if (!missing.isEmpty()) {
                throw invalid("File không đúng mẫu, thiếu cột: " + String.join(", ", missing) + ".");
            }

            List<ExcelRow> rows = new ArrayList<>();
            for (int r = headerRow.getRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                Map<String, String> values = new HashMap<>();
                boolean blank = true;
                for (Map.Entry<Integer, String> column : columns.entrySet()) {
                    Cell cell = row.getCell(column.getKey());
                    String value = cell == null ? "" : cellText(cell, formatter);
                    if (!value.isEmpty()) {
                        blank = false;
                    }
                    values.put(column.getValue(), value);
                }
                if (blank) {
                    continue;
                }
                if (rows.size() >= MAX_ROWS) {
                    throw invalid("File có quá " + MAX_ROWS + " dòng dữ liệu.");
                }
                rows.add(new ExcelRow(r + 1, values));
            }
            return rows;
        } catch (IOException | RuntimeException e) {
            if (e instanceof BusinessException be) {
                throw be;
            }
            throw invalid("Không đọc được file Excel. Vui lòng dùng file mẫu (.xlsx).");
        }
    }

    /** Ô ngày của Excel trả về dạng ISO (yyyy-MM-dd) thay vì theo định dạng hiển thị của máy người dùng. */
    private static String cellText(Cell cell, DataFormatter formatter) {
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate().toString();
        }
        return formatter.formatCellValue(cell).trim();
    }

    /** Nhận ngày dạng yyyy-MM-dd hoặc dd/MM/yyyy (d/M/yyyy). */
    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        for (DateTimeFormatter f : DATE_FORMATS) {
            try {
                return LocalDate.parse(v, f);
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        throw new IllegalArgumentException(v);
    }

    /** STRICT để ngày không tồn tại (31/02) báo lỗi thay vì bị làm tròn thành ngày cuối tháng. */
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT));

    private static String normalize(String header) {
        return header == null ? "" : header.replace("*", "").trim().toLowerCase(Locale.ROOT);
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ErrorCode.VALIDATION_ERROR, message);
    }
}
