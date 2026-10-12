package com.bihome.reminder.dto;

import com.bihome.reminder.Reminder.Channel;
import com.bihome.reminder.Reminder.ScheduleType;
import com.bihome.reminder.Reminder.Status;
import com.bihome.reminder.ReminderDelivery;
import com.bihome.resident.ResidentAudienceService;
import com.bihome.resident.ResidentAudienceService.Audience;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

public final class ReminderDtos {

    private ReminderDtos() {
    }

    /**
     * @param draft true = lưu nháp (không gửi / lên lịch); false: NOW gửi ngay khi lưu, ONCE hẹn {@code scheduledAt},
     *              MONTHLY lặp ngày {@code monthlyDay} lúc {@code monthlyTime} tới {@code endDate} (không bắt buộc)
     */
    public record Request(
            @NotBlank(message = "Tiêu đề không được để trống")
            @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
            String title,
            @NotBlank(message = "Nội dung không được để trống")
            @Size(max = 20000, message = "Nội dung quá dài")
            String content,
            @NotNull(message = "Vui lòng chọn đối tượng nhận") Audience audience,
            @Size(max = 500, message = "Tối đa 500 đối tượng") Set<@NotBlank String> targets,
            @NotEmpty(message = "Vui lòng chọn ít nhất một kênh gửi") Set<@NotNull Channel> channels,
            @NotNull(message = "Vui lòng chọn lịch gửi") ScheduleType scheduleType,
            OffsetDateTime scheduledAt,
            @Min(value = 1, message = "Ngày trong tháng từ 1 đến 31") @Max(value = 31, message = "Ngày trong tháng từ 1 đến 31")
            Integer monthlyDay,
            @JsonFormat(pattern = "HH:mm") LocalTime monthlyTime,
            LocalDate endDate,
            boolean draft,
            Long version) {
    }

    public record AudienceRequest(@NotNull(message = "Vui lòng chọn đối tượng nhận") Audience audience, Set<String> targets) {
    }

    public record RecipientPreview(int count, int withEmail, int withPhone, List<String> sample) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String title,
            Audience audience,
            ScheduleType scheduleType,
            Status status,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String title,
            String content,
            Audience audience,
            List<String> targets,
            /** Nhãn dễ đọc của đối tượng: "Tầng 3, Tầng 5" / "A0101, A0102" / tên cư dân. */
            String targetLabel,
            List<ResidentAudienceService.Target> targetItems,
            List<Channel> channels,
            ScheduleType scheduleType,
            OffsetDateTime scheduledAt,
            Integer monthlyDay,
            @JsonFormat(pattern = "HH:mm") LocalTime monthlyTime,
            LocalDate endDate,
            OffsetDateTime nextRunAt,
            OffsetDateTime lastSentAt,
            int runCount,
            int recipientCount,
            Status status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            Long version) {
    }

    public record DeliveryResponse(
            Long id,
            int runNo,
            Long residentId,
            String residentName,
            String apartmentCode,
            Channel channel,
            String destination,
            ReminderDelivery.Status status,
            String note,
            OffsetDateTime sentAt) {
    }

    public record VersionRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }
}
