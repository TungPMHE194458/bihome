package com.bihome.apartment.dto;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.apartment.ApartmentEnums.OwnershipType;
import com.bihome.apartment.ApartmentEnums.UsageStatus;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.storage.ImageRef;
import com.bihome.common.storage.ImageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class ApartmentDtos {

    private ApartmentDtos() {
    }

    /**
     * @param buildingId chỉ dùng khi tạo mới; bỏ trống = tòa đang chọn ở header. Không đổi được tòa sau khi tạo.
     * @param version    bắt buộc khi cập nhật
     */
    public record Request(
            @Positive Long buildingId,

            @NotBlank(message = "Mã căn hộ không được để trống")
            @Pattern(regexp = "^[A-Za-z0-9._-]{1,30}$",
                    message = "Mã căn hộ tối đa 30 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -")
            String code,

            @NotBlank(message = "Tên căn hộ không được để trống")
            @Size(max = 100, message = "Tên căn hộ tối đa 100 ký tự")
            String name,

            @NotBlank(message = "Tầng không được để trống")
            @Pattern(regexp = "^[A-Za-z0-9-]{1,10}$", message = "Tầng tối đa 10 ký tự, vd 12, 12A, B1")
            String floorNo,

            @Min(value = 0, message = "Số phòng ngủ không được âm")
            @Max(value = 50, message = "Số phòng ngủ tối đa 50")
            Integer bedrooms,

            @Min(value = 0, message = "Số phòng không được âm")
            @Max(value = 100, message = "Số phòng tối đa 100")
            Integer rooms,

            @NotNull(message = "Diện tích không được để trống")
            @DecimalMin(value = "0.01", message = "Diện tích phải lớn hơn 0")
            @DecimalMax(value = "99999999.99", message = "Diện tích quá lớn")
            @Digits(integer = 8, fraction = 2, message = "Diện tích tối đa 2 chữ số thập phân")
            BigDecimal area,

            @NotNull(message = "Vui lòng chọn loại căn hộ")
            ApartmentType type,

            @NotNull(message = "Vui lòng chọn hình thức")
            OwnershipType ownershipType,

            @NotNull(message = "Vui lòng chọn tình trạng sử dụng")
            UsageStatus usageStatus,

            @Size(max = 4000, message = "Mô tả tối đa 4000 ký tự")
            String description,

            @NotNull(message = "Vui lòng chọn trạng thái")
            ActiveStatus status,

            @Size(max = 20, message = "Tối đa 20 ảnh")
            List<@Valid ImageRef> images,

            Long version) {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    /** Gợi ý chọn căn hộ ở form của module khác. */
    public record Option(Long id, String code, String name, Long buildingId, String buildingName) {
    }

    /**
     * {@code buildingId}: lọc theo một tòa cụ thể (vd tab Căn hộ ở chi tiết tòa nhà), ưu tiên hơn tòa ở header.
     * {@code owner}: tên chủ sở hữu còn ở căn.
     */
    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String name,
            String owner,
            String floorNo,
            Integer bedrooms,
            Integer rooms,
            ApartmentType type,
            OwnershipType ownershipType,
            UsageStatus usageStatus,
            ActiveStatus status,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    public record Summary(
            Long id,
            Long buildingId,
            String buildingCode,
            String buildingName,
            String code,
            String name,
            String floorNo,
            Integer bedrooms,
            Integer rooms,
            BigDecimal area,
            ApartmentType type,
            OwnershipType ownershipType,
            UsageStatus usageStatus,
            ActiveStatus status,
            String ownerName,
            long memberCount,
            String coverImageUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingCode,
            String buildingName,
            String code,
            String name,
            String floorNo,
            Integer bedrooms,
            Integer rooms,
            BigDecimal area,
            ApartmentType type,
            OwnershipType ownershipType,
            UsageStatus usageStatus,
            String description,
            ActiveStatus status,
            String ownerName,
            long memberCount,
            List<ImageResponse> images,
            String coverImageUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }
}
