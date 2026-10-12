package com.bihome.notification.dto;

import com.bihome.notification.Announcement.Audience;
import com.bihome.notification.Announcement.Category;
import com.bihome.notification.Announcement.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class AnnouncementDtos {

    private AnnouncementDtos() {
    }

    /** @param scheduledAt null = lưu nháp; có giá trị = hẹn giờ gửi (phải sau hiện tại) */
    public record Request(
            @NotBlank(message = "Tiêu đề không được để trống")
            @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
            String title,
            @NotBlank(message = "Nội dung không được để trống")
            @Size(max = 4000, message = "Nội dung tối đa 4000 ký tự")
            String content,
            @NotNull(message = "Vui lòng chọn loại thông báo") Category category,
            @NotNull(message = "Vui lòng chọn đối tượng nhận") Audience audience,
            OffsetDateTime scheduledAt,
            @Size(max = 10, message = "Tối đa 10 tệp đính kèm") List<@NotNull Long> fileIds,
            Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String title,
            Category category,
            Audience audience,
            Status status,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Attachment(Long fileId, String name, long size, String contentType, String url) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String title,
            String content,
            Category category,
            Audience audience,
            Status status,
            OffsetDateTime scheduledAt,
            OffsetDateTime sentAt,
            String sentBy,
            int staffCount,
            int residentCount,
            List<Attachment> attachments,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            Long version) {
    }
}
