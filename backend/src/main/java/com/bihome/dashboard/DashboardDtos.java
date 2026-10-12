package com.bihome.dashboard;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    /**
     * Số liệu bảng điều khiển theo tòa đang chọn (hoặc mọi tòa được truy cập) và tháng được chọn.
     * Tỉ lệ thu phí null khi chưa có kỳ nào phát hành thông báo phí — FE hiển thị "—".
     */
    public record Summary(
            YearMonth month,
            SystemOverview system,
            long buildingCount,
            long apartmentCount,
            long occupiedApartmentCount,
            long residentCount,
            long openTickets,
            long overdueTickets,
            long ticketsCreatedInMonth,
            long ticketsResolvedInMonth,
            Long amenityBookingsToday,
            Long amenityBookingsInMonth,
            Long feeDebt,
            Double feeCollectionRate,
            long activeAccessCards,
            long validVouchers,
            List<MonthPoint> ticketsByMonth,
            List<NamedCount> ticketsByCategory,
            List<NamedCount> openTicketsByStatus,
            List<RecentTicket> recentTickets,
            List<WeekPoint> bookingsByWeek,
            /** Kỳ dùng để tính tỉ lệ thu phí (kỳ gần nhất ≤ tháng chọn đã phát hành thông báo). */
            String feePeriod,
            List<FeePoint> feeByPeriod) {
    }

    /**
     * Thu phí theo kỳ: {@code billed} phát sinh của kỳ (không gồm nợ kỳ trước chuyển sang), {@code collected} số đã
     * thu cho phần phát sinh đó (tiền thu được trừ vào nợ cũ trước).
     */
    public record FeePoint(String period, long billed, long collected) {
    }

    /** Chỉ Admin hệ thống: số liệu toàn hệ thống. */
    public record SystemOverview(long activeUsers, long loginsToday, long storageBytes, long fileCount) {
    }

    /** @param month 1–12 của năm được chọn */
    public record MonthPoint(int month, long created, long resolved) {
    }

    public record NamedCount(String key, String name, long count) {
    }

    /** Lượt đăng ký tiện ích (đang giữ chỗ / hoàn thành) theo tuần bắt đầu thứ 2. */
    public record WeekPoint(LocalDate weekStart, long bookings, long people) {
    }

    public record RecentTicket(
            Long id,
            String code,
            String title,
            String status,
            String priority,
            String categoryName,
            String buildingName,
            boolean overdue,
            OffsetDateTime createdAt) {
    }
}
