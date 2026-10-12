package com.bihome.amenityreport;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class AmenityReportDtos {

    private AmenityReportDtos() {
    }

    /**
     * @param fillRate     người đã giữ chỗ / tổng sức chứa các khung giờ trong khoảng (0–1)
     * @param cancelRate   (huỷ + từ chối) / tổng lượt (0–1)
     * @param revenue      phí phải thu (giao dịch chưa thanh toán + đã thanh toán)
     * @param collected    đã thu
     */
    public record Report(
            LocalDate from,
            LocalDate to,
            long totalBookings,
            long activeBookings,
            long cancelledBookings,
            long people,
            double fillRate,
            double cancelRate,
            BigDecimal revenue,
            BigDecimal collected,
            List<DayPoint> byDay,
            List<AmenityRow> byAmenity,
            List<SlotPoint> bySlot,
            List<StatusCount> byStatus) {
    }

    public record DayPoint(LocalDate date, long bookings, long people) {
    }

    public record AmenityRow(Long amenityId, String code, String name, long bookings, long cancelled, long people,
                             long capacity, double fillRate, BigDecimal revenue) {
    }

    /** @param startTime HH:mm */
    public record SlotPoint(String startTime, long bookings, long people) {
    }

    public record StatusCount(String status, long count) {
    }
}
