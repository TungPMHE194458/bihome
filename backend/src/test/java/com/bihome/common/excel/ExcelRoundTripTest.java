package com.bihome.common.excel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.storage.DetectedFileType;
import com.bihome.common.storage.FileTypeDetector;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import org.apache.poi.ss.usermodel.Sheet;
import org.junit.jupiter.api.Test;

class ExcelRoundTripTest {

    private static byte[] workbook(List<String> headers, List<List<?>> rows) {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Dữ liệu", headers);
            rows.forEach(r -> excel.row(sheet, r));
            return excel.toBytes();
        }
    }

    @Test
    void writtenWorkbookIsDetectedAsXlsxAndReadsBackByHeader() {
        byte[] data = workbook(List.of("Mã *", "Diện tích", "Ngày"),
                List.of(List.of("A01", 75.5, OffsetDateTime.parse("2026-10-02T03:51:00Z")), List.of("A02", 120)));

        assertThat(FileTypeDetector.detect(data, "x.xlsx")).contains(DetectedFileType.XLSX);
        List<ExcelReader.ExcelRow> rows = ExcelReader.read(new ByteArrayInputStream(data), List.of("Mã", "Diện tích"));

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).rowNumber()).isEqualTo(2);
        assertThat(rows.get(0).get("mã")).isEqualTo("A01");
        assertThat(rows.get(0).get("Diện tích")).isEqualTo("75.5");
        assertThat(rows.get(0).get("Ngày")).isEqualTo("02/10/2026 10:51");
        assertThat(rows.get(1).get("Diện tích")).isEqualTo("120");
        assertThat(rows.get(1).get("Ngày")).isEmpty();
    }

    @Test
    void blankRowsAreSkippedAndKeepTheirExcelRowNumbers() {
        byte[] data = workbook(List.of("Mã"), List.of(List.of("A01"), Arrays.asList((Object) null), List.of("A03")));

        List<ExcelReader.ExcelRow> rows = ExcelReader.read(new ByteArrayInputStream(data), List.of("Mã"));

        assertThat(rows).extracting(ExcelReader.ExcelRow::rowNumber).containsExactly(2, 4);
    }

    @Test
    void missingRequiredColumnsAreReported() {
        byte[] data = workbook(List.of("Mã"), List.of(List.of("A01")));

        assertThatThrownBy(() -> ExcelReader.read(new ByteArrayInputStream(data), List.of("Mã", "Tầng", "Loại")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("File không đúng mẫu, thiếu cột: Tầng, Loại.");
    }

    @Test
    void nonExcelContentGivesAFriendlyError() {
        assertThatThrownBy(() -> ExcelReader.read(new ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8)),
                List.of("Mã")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Không đọc được file Excel");
    }
}
