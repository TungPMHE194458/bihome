package com.bihome.ticket.dto;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.ticket.TicketEnums.EntryType;
import com.bihome.ticket.TicketEnums.TicketChannel;
import com.bihome.ticket.TicketEnums.TicketPriority;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.ticket.TicketEnums.Visibility;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class TicketDtos {

    private TicketDtos() {
    }

    // ---------- Danh mục ----------

    public record CategoryRequest(
            @NotBlank(message = "Tên danh mục không được để trống")
            @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
            String name,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
            String description,
            @NotNull(message = "SLA phản hồi không được để trống")
            @Min(value = 1, message = "SLA phản hồi tối thiểu 1 giờ")
            @Max(value = 9999, message = "SLA phản hồi tối đa 9999 giờ")
            Integer responseSlaHours,
            @NotNull(message = "SLA xử lý không được để trống")
            @Min(value = 1, message = "SLA xử lý tối thiểu 1 giờ")
            @Max(value = 9999, message = "SLA xử lý tối đa 9999 giờ")
            Integer resolutionSlaHours,
            @Positive Long defaultAssigneeId,
            @NotNull(message = "Vui lòng chọn trạng thái")
            ActiveStatus status,
            Long version) {
    }

    public record ChangeCategoryStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    public record CategoryFilter(
            String keyword,
            String name,
            ActiveStatus status,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record CategoryResponse(
            Long id,
            String name,
            String description,
            int responseSlaHours,
            int resolutionSlaHours,
            Long defaultAssigneeId,
            String defaultAssigneeName,
            ActiveStatus status,
            long ticketCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            Long version) {
    }

    public record CategoryOption(Long id, String name, int responseSlaHours, int resolutionSlaHours,
                                 Long defaultAssigneeId) {
    }

    /** Người có thể xử lý yêu cầu. */
    public record Assignee(Long id, String username, String fullName, String avatarUrl) {
    }

    // ---------- Yêu cầu ----------

    /**
     * @param fileIds tệp đính kèm của yêu cầu (đã tải lên với mục đích TICKET_ATTACHMENT); gửi đủ danh sách mong muốn,
     *                tệp không còn trong danh sách sẽ bị xoá
     * @param assigneeId chỉ dùng khi tạo; bỏ trống = người phụ trách mặc định của danh mục (nếu làm việc ở tòa)
     */
    public record Request(
            @NotBlank(message = "Tiêu đề không được để trống")
            @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
            String title,
            @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự")
            String description,
            @NotNull(message = "Vui lòng chọn danh mục")
            Long categoryId,
            @Positive Long apartmentId,
            @Positive Long residentId,
            @NotNull(message = "Vui lòng chọn kênh tiếp nhận")
            TicketChannel channel,
            @NotNull(message = "Vui lòng chọn mức ưu tiên")
            TicketPriority priority,
            @Positive Long assigneeId,
            @Size(max = 10, message = "Tối đa 10 tệp đính kèm")
            List<@NotNull Long> fileIds,
            Long version) {
    }

    /** @param note bắt buộc khi Huỷ (lý do) */
    public record StatusRequest(
            @NotNull(message = "Vui lòng chọn trạng thái") TicketStatus status,
            @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự") String note,
            Visibility visibility,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    /** @param assigneeId null = bỏ phân công */
    public record AssignRequest(
            @Positive Long assigneeId,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record CommentRequest(
            @NotBlank(message = "Nội dung không được để trống")
            @Size(max = 4000, message = "Nội dung tối đa 4000 ký tự")
            String content,
            @NotNull(message = "Vui lòng chọn phạm vi hiển thị") Visibility visibility,
            @Size(max = 5, message = "Tối đa 5 tệp đính kèm")
            List<@NotNull Long> fileIds) {
    }

    public record RatingRequest(
            @NotNull(message = "Vui lòng chọn số sao")
            @Min(value = 1, message = "Đánh giá từ 1 đến 5 sao")
            @Max(value = 5, message = "Đánh giá từ 1 đến 5 sao")
            Integer rating,
            @Size(max = 1000, message = "Nhận xét tối đa 1000 ký tự") String comment) {
    }

    /** {@code overdue=true}: chỉ yêu cầu còn mở đã quá hạn SLA. */
    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String title,
            Long categoryId,
            Long apartmentId,
            String apartment,
            Long residentId,
            TicketPriority priority,
            TicketChannel channel,
            Long assigneeId,
            Boolean unassigned,
            TicketStatus status,
            Boolean overdue,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    public record Summary(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            String title,
            Long categoryId,
            String categoryName,
            Long apartmentId,
            String apartmentCode,
            String apartmentName,
            Long residentId,
            String residentName,
            String residentPhone,
            TicketChannel channel,
            TicketPriority priority,
            Long assigneeId,
            String assigneeName,
            TicketStatus status,
            OffsetDateTime responseDueAt,
            OffsetDateTime resolutionDueAt,
            boolean overdue,
            Integer rating,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            Long version) {
    }

    public record Attachment(Long id, Long fileId, String name, long size, String contentType, String url) {
    }

    public record Response(
            Summary ticket,
            String description,
            OffsetDateTime respondedAt,
            OffsetDateTime resolvedAt,
            OffsetDateTime closedAt,
            String ratingComment,
            List<Attachment> attachments,
            List<TicketStatus> allowedStatuses,
            String createdBy,
            String createdByName) {
    }

    /** {@code actorName}: họ tên người thực hiện (CREATED_BY). */
    public record TimelineEntry(
            Long id,
            EntryType type,
            Visibility visibility,
            String content,
            TicketStatus fromStatus,
            TicketStatus toStatus,
            Long assigneeId,
            String assigneeName,
            String actorUsername,
            String actorName,
            OffsetDateTime createdAt,
            List<Attachment> attachments) {
    }

    /** Một cột Kanban: tổng số và tối đa {@code limit} yêu cầu mới nhất. */
    public record BoardColumn(TicketStatus status, long total, List<Summary> items) {
    }
}
