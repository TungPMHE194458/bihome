package com.bihome.document.dto;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.document.DocumentAudience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class DocumentDtos {

    private DocumentDtos() {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    // ---------- Danh mục ----------

    public record CategoryRequest(
            @NotBlank(message = "Tên danh mục không được để trống")
            @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
            String name,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
            String description,
            @NotBlank(message = "Vui lòng chọn màu")
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Màu phải có dạng #RRGGBB")
            String color,
            @NotNull(message = "Vui lòng chọn trạng thái")
            ActiveStatus status,
            Long version) {
    }

    public record CategoryFilter(
            String keyword,
            String name,
            String description,
            ActiveStatus status,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    /** {@code documentCount}: số tài liệu ở mọi tòa thuộc danh mục. */
    public record CategoryResponse(
            Long id,
            String name,
            String description,
            String color,
            ActiveStatus status,
            long documentCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }

    public record CategoryOption(Long id, String name, String color, ActiveStatus status) {
    }

    // ---------- Tài liệu ----------

    /**
     * @param code   bỏ trống = tự sinh số tăng dần trong tòa
     * @param fileId bắt buộc khi tạo mới (tệp đã tải lên với mục đích DOCUMENT); bỏ qua khi cập nhật — dùng "Thay file"
     */
    public record Request(
            @Pattern(regexp = "^$|^[A-Za-z0-9._-]{1,30}$",
                    message = "Mã tài liệu tối đa 30 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -")
            String code,
            @NotBlank(message = "Tên tài liệu không được để trống")
            @Size(max = 255, message = "Tên tài liệu tối đa 255 ký tự")
            String name,
            @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
            String description,
            @NotNull(message = "Vui lòng chọn danh mục")
            Long categoryId,
            @NotNull(message = "Vui lòng chọn đối tượng")
            DocumentAudience audience,
            @Size(max = 10, message = "Tối đa 10 thẻ")
            List<@NotBlank(message = "Thẻ không được để trống") @Size(max = 50, message = "Mỗi thẻ tối đa 50 ký tự") String> tags,
            @Positive Long fileId,
            Long version) {
    }

    public record ReplaceFileRequest(
            @NotNull(message = "Vui lòng chọn tệp mới") @Positive Long fileId,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    /** {@code tag}: tài liệu có ít nhất một thẻ khớp. */
    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String name,
            String tag,
            Long categoryId,
            String description,
            DocumentAudience audience,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingCode,
            String buildingName,
            String code,
            String name,
            String description,
            Long categoryId,
            String categoryName,
            String categoryColor,
            DocumentAudience audience,
            List<String> tags,
            String fileName,
            long fileSize,
            String contentType,
            int fileVersionNo,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }

    /**
     * Một phiên bản tệp; {@code id} null = phiên bản hiện tại.
     * {@code uploadedAt/By}: lúc/người tải tệp lên; {@code replacedAt/By}: lúc/người thay bằng bản mới (null nếu hiện tại).
     */
    public record FileVersion(
            Long id,
            int versionNo,
            boolean current,
            String fileName,
            long fileSize,
            String contentType,
            OffsetDateTime uploadedAt,
            String uploadedBy,
            OffsetDateTime replacedAt,
            String replacedBy,
            String note) {
    }
}
