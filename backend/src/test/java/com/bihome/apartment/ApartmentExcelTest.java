package com.bihome.apartment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.apartment.ApartmentEnums.OwnershipType;
import com.bihome.apartment.ApartmentEnums.UsageStatus;
import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.excel.ExcelReader;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ApartmentExcelTest {

    private static ExcelReader.ExcelRow row(Map<String, String> cells) {
        Map<String, String> normalized = new HashMap<>();
        cells.forEach((k, v) -> normalized.put(k.toLowerCase(Locale.ROOT), v));
        return new ExcelReader.ExcelRow(2, normalized);
    }

    private static Map<String, String> valid() {
        Map<String, String> cells = new HashMap<>();
        cells.put(ApartmentExcel.CODE, "a1205");
        cells.put(ApartmentExcel.NAME, "A-12.05");
        cells.put(ApartmentExcel.FLOOR, "12");
        cells.put(ApartmentExcel.AREA, "75,5");
        cells.put(ApartmentExcel.TYPE, "căn hộ");
        cells.put(ApartmentExcel.OWNERSHIP, "OWN");
        return cells;
    }

    @Test
    void parsesLabelsOrCodesAndAppliesDefaults() {
        ApartmentDtos.Request req = ApartmentExcel.parse(row(valid()));

        assertThat(req.area()).isEqualByComparingTo(new BigDecimal("75.5"));
        assertThat(req.type()).isEqualTo(ApartmentType.APARTMENT);
        assertThat(req.ownershipType()).isEqualTo(OwnershipType.OWN);
        assertThat(req.usageStatus()).isEqualTo(UsageStatus.VACANT);
        assertThat(req.status()).isEqualTo(ActiveStatus.ACTIVE);
        assertThat(req.buildingId()).isNull();
    }

    @Test
    void reportsEveryBadCellInOneMessage() {
        Map<String, String> cells = valid();
        cells.put(ApartmentExcel.AREA, "rộng");
        cells.put(ApartmentExcel.TYPE, "Lâu đài");
        cells.put(ApartmentExcel.BEDROOMS, "2.5");

        assertThatThrownBy(() -> ApartmentExcel.parse(row(cells)))
                .isInstanceOf(ApartmentExcel.CellException.class)
                .hasMessageContaining("Diện tích (m²) không phải là số")
                .hasMessageContaining("Số phòng ngủ phải là số nguyên")
                .hasMessageContaining("Loại \"Lâu đài\" không hợp lệ");
    }

    @Test
    void templateCanBeReadBackWithTheRequiredHeaders() {
        List<ExcelReader.ExcelRow> rows = ExcelReader.read(new ByteArrayInputStream(ApartmentExcel.template()),
                ApartmentExcel.REQUIRED);

        assertThat(rows).hasSize(2);
        ApartmentDtos.Request first = ApartmentExcel.parse(rows.getFirst());
        assertThat(first.code()).isEqualTo("A1205");
        assertThat(first.usageStatus()).isEqualTo(UsageStatus.OCCUPIED);
    }
}
