package com.bihome.asset.dto;

import com.bihome.common.entity.ActiveStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class AssetDtos {

    private AssetDtos() {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    // ---------- Danh mục ----------

    /** {@code buildingId} chỉ dùng khi tạo mới; bỏ trống = tòa đang chọn ở header. */
    public record CategoryRequest(
            @Positive Long buildingId,
            @NotBlank(message = "Tên danh mục không được để trống")
            @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
            String name,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
            String description,
            @NotBlank(message = "Đơn vị không được để trống")
            @Size(max = 30, message = "Đơn vị tối đa 30 ký tự")
            String unit,
            @NotNull(message = "Vui lòng chọn trạng thái")
            ActiveStatus status,
            Long version) {
    }

    public record CategoryFilter(
            String keyword,
            Long buildingId,
            String name,
            String unit,
            ActiveStatus status,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    public record CategoryResponse(
            Long id,
            Long buildingId,
            String buildingName,
            String name,
            String description,
            String unit,
            ActiveStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }

    public record CategoryOption(Long id, String name, String unit, ActiveStatus status) {
    }

    // ---------- Hạng mục ----------

    public record ItemRequest(
            @NotNull(message = "Vui lòng chọn căn hộ")
            Long apartmentId,
            @NotNull(message = "Vui lòng chọn danh mục")
            Long categoryId,
            @NotBlank(message = "Tên hạng mục không được để trống")
            @Size(max = 150, message = "Tên hạng mục tối đa 150 ký tự")
            String name,
            @Size(max = 30, message = "Số hiệu tối đa 30 ký tự")
            String plateNumber,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
            String description,
            /** Bỏ trống = lấy đơn vị của danh mục. */
            @Size(max = 30, message = "Đơn vị tối đa 30 ký tự")
            String unit,
            @NotNull(message = "Ngày vào không được để trống")
            LocalDate entryDate,
            LocalDate exitDate,
            @NotNull(message = "Vui lòng chọn trạng thái")
            ActiveStatus status,
            Long version) {
    }

    public record ItemFilter(
            String keyword,
            Long buildingId,
            Long apartmentId,
            String apartment,
            String name,
            String plateNumber,
            String accessCardNo,
            Long categoryId,
            /** Tên danh mục (khớp chính xác) — lọc ở chế độ "Tất cả" tòa, khi mỗi tòa có danh mục riêng cùng tên. */
            String categoryName,
            ActiveStatus status,
            LocalDate entryFrom,
            LocalDate entryTo,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record ItemResponse(
            Long id,
            Long buildingId,
            String buildingName,
            Long apartmentId,
            String apartmentCode,
            String apartmentName,
            Long categoryId,
            String categoryName,
            String name,
            String plateNumber,
            String accessCardNo,
            String description,
            String unit,
            LocalDate entryDate,
            LocalDate exitDate,
            ActiveStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }
}
