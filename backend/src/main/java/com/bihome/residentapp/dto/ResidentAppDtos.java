package com.bihome.residentapp.dto;

import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentPushToken;
import com.bihome.sos.SosAlert.AlertType;
import com.bihome.survey.dto.SurveyDtos;
import com.bihome.survey.dto.SurveyDtos.AnswerRequest;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
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

/**
 * DTO riêng của app cư dân. Dữ liệu nghiệp vụ (thông báo phí, yêu cầu, lượt đặt...) dùng lại DTO của module tương
 * ứng; URL tệp trong đó dạng {@code /api/v1/files/{id}} — app gọi {@code /api/v1/resident/files/{id}} thay thế.
 */
public final class ResidentAppDtos {

    private ResidentAppDtos() {
    }

    public record AppConfig(String minVersion, String companyName, String hotline, String email) {
    }

    public record Apartment(Long id, String code, String name, Long buildingId, String buildingName, ResidentRole role,
                            boolean householdHead) {
    }

    public record Me(Long residentId, String code, String fullName, String phone, String email, String avatarUrl,
                     String buildingName, boolean mustChangePassword, List<Apartment> apartments) {
    }

    /** Số liệu trang chủ của một căn. */
    public record Home(Long apartmentId, BigDecimal outstanding, long unpaidNotices, LocalDate nearestDueDate,
                       long openTickets, long upcomingBookings, long unreadInbox) {
    }

    public record InboxItem(Long id, ResidentInboxItem.Type type, String title, String body, String link, boolean read,
                            OffsetDateTime createdAt) {
    }

    public record UnreadCount(long count) {
    }

    public record PushTokenRequest(
            @NotBlank @Size(max = 255) String token,
            @NotNull ResidentPushToken.Platform platform) {
    }

    public record TicketCreateRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Vui lòng chọn danh mục") Long categoryId,
            @NotBlank(message = "Tiêu đề không được để trống")
            @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự") String title,
            @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự") String description,
            @Size(max = 10, message = "Tối đa 10 ảnh đính kèm") List<@NotNull Long> fileIds) {
    }

    public record TicketCommentRequest(
            @NotBlank(message = "Nội dung không được để trống")
            @Size(max = 4000, message = "Nội dung tối đa 4000 ký tự") String content,
            @Size(max = 5, message = "Tối đa 5 ảnh đính kèm") List<@NotNull Long> fileIds) {
    }

    public record TicketRatingRequest(
            @NotNull(message = "Vui lòng chọn số sao")
            @Min(value = 1, message = "Đánh giá từ 1 đến 5 sao")
            @Max(value = 5, message = "Đánh giá từ 1 đến 5 sao") Integer rating,
            @Size(max = 1000, message = "Nhận xét tối đa 1000 ký tự") String comment) {
    }

    public record BookingRequest(
            @NotNull(message = "Vui lòng chọn tiện ích") Long amenityId,
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Vui lòng chọn ngày sử dụng") LocalDate bookingDate,
            @NotNull(message = "Vui lòng chọn khung giờ") @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull(message = "Vui lòng chọn khung giờ") @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            @NotNull(message = "Số người không được để trống")
            @Min(value = 1, message = "Số người tối thiểu là 1")
            @Max(value = 9999, message = "Số người quá lớn") Integer peopleCount,
            @Size(max = 30, message = "Mã voucher tối đa 30 ký tự") String voucherCode,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {
    }

    public record CancelRequest(
            @NotBlank(message = "Vui lòng nhập lý do")
            @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record SurveyItem(Long id, String title, String description, OffsetDateTime startAt, OffsetDateTime endAt,
                             boolean anonymous, int questionCount, boolean answered) {
    }

    public record SurveyDetail(Long id, String title, String description, OffsetDateTime startAt, OffsetDateTime endAt,
                               boolean anonymous, boolean accepting, boolean answered,
                               List<SurveyDtos.QuestionResponse> questions) {
    }

    public record SurveyAnswerRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Thiếu câu trả lời") List<@Valid @NotNull AnswerRequest> answers) {
    }

    public record ServiceOrderRequest(
            @NotNull(message = "Vui lòng chọn dịch vụ") Long serviceId,
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Số lượng không được để trống")
            @DecimalMin(value = "0.01", message = "Số lượng phải lớn hơn 0")
            @DecimalMax(value = "99999", message = "Số lượng quá lớn")
            @Digits(integer = 5, fraction = 2, message = "Số lượng tối đa 2 chữ số thập phân") BigDecimal quantity,
            OffsetDateTime scheduledAt,
            @Size(max = 30, message = "Mã voucher tối đa 30 ký tự") String voucherCode,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {
    }

    public record SosRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Vui lòng chọn loại sự cố") AlertType alertType,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự") String description) {
    }
}
