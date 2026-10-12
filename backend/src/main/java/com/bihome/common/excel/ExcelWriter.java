package com.bihome.common.excel;

import com.bihome.common.storage.StorageException;
import com.bihome.common.util.AppTime;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Ghi file .xlsx đơn giản: hàng tiêu đề in đậm nền xanh, ngày giờ hiển thị theo giờ Việt Nam. */
public final class ExcelWriter implements AutoCloseable {

    public static final String CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int MAX_COLUMN_WIDTH = 60 * 256;

    private final XSSFWorkbook workbook = new XSSFWorkbook();
    private final CellStyle headerStyle;

    public ExcelWriter() {
        headerStyle = workbook.createCellStyle();
        Font bold = workbook.createFont();
        bold.setBold(true);
        bold.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(bold);
        headerStyle.setFillForegroundColor(IndexedColors.GREEN.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(BorderStyle.THIN);
    }

    public Sheet sheet(String name, List<String> headers) {
        Sheet sheet = workbook.createSheet(name);
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.size(); i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(headerStyle);
        }
        sheet.createFreezePane(0, 1);
        return sheet;
    }

    public void row(Sheet sheet, List<?> values) {
        Row row = sheet.createRow(sheet.getLastRowNum() + 1);
        for (int i = 0; i < values.size(); i++) {
            Object value = values.get(i);
            if (value == null) {
                continue;
            }
            Cell cell = row.createCell(i);
            switch (value) {
                case Number n when !(n instanceof BigDecimal) -> cell.setCellValue(n.doubleValue());
                case BigDecimal d -> cell.setCellValue(d.doubleValue());
                case OffsetDateTime t -> cell.setCellValue(t.atZoneSameInstant(AppTime.ZONE).format(DATE_TIME));
                case LocalDate d -> cell.setCellValue(d.format(DATE));
                default -> cell.setCellValue(value.toString());
            }
        }
    }

    public byte[] toBytes() {
        for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
            Sheet sheet = workbook.getSheetAt(s);
            Row header = sheet.getRow(0);
            if (header == null) {
                continue;
            }
            for (int c = 0; c < header.getLastCellNum(); c++) {
                sheet.autoSizeColumn(c);
                sheet.setColumnWidth(c, Math.min(sheet.getColumnWidth(c) + 512, MAX_COLUMN_WIDTH));
            }
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new StorageException("Không tạo được file Excel.", e);
        }
    }

    @Override
    public void close() {
        try {
            workbook.close();
        } catch (IOException ignored) {
            // Workbook trong bộ nhớ, không có tài nguyên ngoài cần giải phóng.
        }
    }
}
