package com.bihome.servicecatalog.dto;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.storage.ImageRef;
import com.bihome.common.storage.ImageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class ServiceDtos {

    private ServiceDtos() {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    // ---------- Loại dịch vụ ----------

    public record TypeRequest(
            @NotBlank(message = "Tên loại dịch vụ không được để trống")
            @Size(max = 100, message = "Tên loại dịch vụ tối đa 100 ký tự")
            String name,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự") String description,
            @NotNull(message = "Vui lòng chọn trạng thái") ActiveStatus status,
            Long version) {
    }

    public record TypeFilter(String keyword, String name, ActiveStatus status, LocalDate createdFrom, LocalDate createdTo) {
    }

    public record TypeResponse(
            Long id,
            String name,
            String description,
            ActiveStatus status,
            long serviceCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            Long version) {
    }

    public record TypeOption(Long id, String name) {
    }

    // ---------- Dịch vụ ----------

    /** @param code bỏ trống = tự sinh DV + 4 số trong tòa */
    public record Request(
            @Pattern(regexp = "^$|^[A-Za-z0-9_-]{2,30}$", message = "Mã dịch vụ 2–30 ký tự, chỉ gồm chữ không dấu, chữ số, _ và -")
            String code,
            @NotBlank(message = "Tên dịch vụ không được để trống")
            @Size(max = 150, message = "Tên dịch vụ tối đa 150 ký tự")
            String name,
            @NotNull(message = "Vui lòng chọn loại dịch vụ") Long serviceTypeId,
            @NotNull(message = "Đơn giá không được để trống")
            @DecimalMin(value = "0", message = "Đơn giá không được âm")
            @Digits(integer = 12, fraction = 0, message = "Đơn giá là số nguyên (VND)")
            BigDecimal unitPrice,
            @NotBlank(message = "Đơn vị tính không được để trống")
            @Size(max = 30, message = "Đơn vị tính tối đa 30 ký tự")
            String unit,
            @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự") String description,
            @NotNull(message = "Vui lòng chọn trạng thái") ActiveStatus status,
            @Size(max = 20, message = "Tối đa 20 ảnh") List<@Valid ImageRef> images,
            Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String name,
            Long serviceTypeId,
            ActiveStatus status,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            String name,
            Long serviceTypeId,
            String serviceTypeName,
            BigDecimal unitPrice,
            String unit,
            String description,
            ActiveStatus status,
            List<ImageResponse> images,
            String coverImageUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            Long version) {
    }

    public record Option(Long id, String code, String name, BigDecimal unitPrice, String unit, Long buildingId) {
    }
}
