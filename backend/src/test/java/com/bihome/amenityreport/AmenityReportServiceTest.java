package com.bihome.amenityreport;

import static org.assertj.core.api.Assertions.assertThat;

import com.bihome.amenity.Amenity;
import com.bihome.amenity.AmenityConfig;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class AmenityReportServiceTest {

    @Test
    void capacitySumsSlotsPerWeekdayAndSkipsMaintenanceDays() {
        Amenity a = new Amenity();
        a.setCapacity(10);
        AmenityConfig c = new AmenityConfig();
        // Thứ 2: 2 khung (sức chứa mặc định 10 + riêng 4); Chủ nhật: 1 khung.
        c.setSlots(List.of(
                new AmenityConfig.Slot(1, LocalTime.of(6, 0), LocalTime.of(7, 0), null),
                new AmenityConfig.Slot(1, LocalTime.of(7, 0), LocalTime.of(8, 0), 4),
                new AmenityConfig.Slot(7, LocalTime.of(6, 0), LocalTime.of(7, 0), null)));
        // 2026-10-12 (thứ 2) → 2026-10-25 (chủ nhật): 2 thứ 2 + 2 chủ nhật; bảo trì thứ 2 ngày 19.
        c.setMaintenances(List.of(new AmenityConfig.Maintenance(LocalDate.of(2026, 10, 19), LocalDate.of(2026, 10, 19), "Sơn")));

        long cap = AmenityReportService.capacity(a, c, LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 25));
        assertThat(cap).isEqualTo(14 + 10 + 10);
        assertThat(AmenityReportService.capacity(a, null, LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 25))).isZero();
    }
}
