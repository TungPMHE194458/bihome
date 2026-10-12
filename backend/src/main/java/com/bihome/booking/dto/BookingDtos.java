package com.bihome.booking.dto;

import com.bihome.amenity.AmenityConfig.PriceUnit;
import com.bihome.booking.AmenityBooking.Status;
import com.bihome.transaction.dto.TransactionDtos;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

public final class BookingDtos {

    private BookingDtos() {
    }

    /** Khung giờ phải trùng một khung đã cấu hình của tiện ích cho thứ của ngày sử dụng. */
    public record Request(
            @NotNull(message = "Vui lòng chọn tiện ích") Long amenityId,
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            Long residentId,
            @NotNull(message = "Vui lòng chọn ngày sử dụng") LocalDate bookingDate,
            @NotNull(message = "Vui lòng chọn khung giờ") @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull(message = "Vui lòng chọn khung giờ") @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            @NotNull(message = "Số người không được để trống")
            @Min(value = 1, message = "Số người tối thiểu là 1")
            @Max(value = 9999, message = "Số người quá lớn")
            Integer peopleCount,
            @Size(max = 30, message = "Mã voucher tối đa 30 ký tự") String voucherCode,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {
    }

    /** Tính thử phí (và voucher) trước khi đặt. */
    public record QuoteResponse(
            BigDecimal unitPrice,
            PriceUnit priceUnit,
            BigDecimal fee,
            String voucherCode,
            BigDecimal discount,
            BigDecimal total,
            boolean requiresApproval,
            int remaining) {
    }

    public record SlotAvailability(
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            int capacity,
            long booked,
            long remaining,
            BigDecimal price,
            PriceUnit priceUnit,
            /** Đã qua giờ bắt đầu (hôm nay). */
            boolean past) {
    }

    /**
     * @param closedReason khác null = không nhận đặt ngày này (bảo trì, đóng cửa, ngoài thời gian đặt trước)
     */
    public record DayAvailability(LocalDate date, String closedReason, List<SlotAvailability> slots) {
    }

    public record AvailabilityResponse(
            Long amenityId,
            String amenityName,
            int capacity,
            boolean requiresApproval,
            int maxAdvanceDays,
            Integer maxBookingsPerWeek,
            int freeCancelHours,
            List<DayAvailability> days) {
    }

    /** Lịch tuần: các lượt đặt đang giữ chỗ của tiện ích theo ngày + khung giờ. */
    public record CalendarBooking(
            Long id,
            String code,
            LocalDate bookingDate,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            String apartmentCode,
            int peopleCount,
            Status status) {
    }

    public record CalendarResponse(AvailabilityResponse availability, List<CalendarBooking> bookings) {
    }

    /** @param apartment mã căn hộ (chứa) */
    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            Long amenityId,
            Long apartmentId,
            String apartment,
            Long residentId,
            LocalDate bookingFrom,
            LocalDate bookingTo,
            Status status,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            Long amenityId,
            String amenityCode,
            String amenityName,
            Long apartmentId,
            String apartmentCode,
            Long residentId,
            String residentName,
            LocalDate bookingDate,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            int peopleCount,
            BigDecimal unitPrice,
            PriceUnit priceUnit,
            BigDecimal fee,
            Long voucherId,
            String voucherCode,
            BigDecimal discount,
            BigDecimal total,
            Status status,
            String note,
            String rejectReason,
            String cancelReason,
            OffsetDateTime decidedAt,
            String decidedBy,
            OffsetDateTime cancelledAt,
            OffsetDateTime completedAt,
            /** Huỷ trước thời điểm này thì miễn phí (trả voucher, huỷ / hoàn tiền). */
            OffsetDateTime freeCancelUntil,
            TransactionDtos.Summary transaction,
            OffsetDateTime createdAt,
            String createdBy,
            Long version) {
    }

    public record VersionRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record ReasonRequest(
            @NotBlank(message = "Vui lòng nhập lý do")
            @Size(max = 500, message = "Lý do tối đa 500 ký tự")
            String reason,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }
}
