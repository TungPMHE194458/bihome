package com.bihome.building.dto;

import com.bihome.building.BuildingType;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.storage.ImageRef;
import com.bihome.common.storage.ImageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class BuildingDtos {

    private BuildingDtos() {
    }

    /** {@code version} bắt buộc khi cập nhật, bỏ trống khi tạo mới. */
    public record Request(
            @NotBlank(message = "Mã tòa nhà không được để trống")
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,30}$",
                    message = "Mã tòa nhà tối đa 30 ký tự, chỉ gồm chữ không dấu, chữ số, - và _")
            String code,

            @NotBlank(message = "Tên tòa nhà không được để trống")
            @Size(max = 200, message = "Tên tòa nhà tối đa 200 ký tự")
            String name,

            @NotBlank(message = "Vui lòng chọn Tỉnh/Thành phố")
            @Size(max = 100, message = "Tỉnh/Thành phố tối đa 100 ký tự")
            String province,

            @NotBlank(message = "Vui lòng nhập Phường/Xã")
            @Size(max = 100, message = "Phường/Xã tối đa 100 ký tự")
            String ward,

            @NotBlank(message = "Vui lòng nhập địa chỉ chi tiết")
            @Size(max = 255, message = "Địa chỉ chi tiết tối đa 255 ký tự")
            String addressDetail,

            @NotNull(message = "Vui lòng chọn loại tòa nhà")
            BuildingType type,

            @Min(value = 0, message = "Số tầng nổi không được âm")
            @Max(value = 300, message = "Số tầng nổi tối đa 300")
            Integer floorsAbove,

            @Min(value = 0, message = "Số tầng hầm không được âm")
            @Max(value = 30, message = "Số tầng hầm tối đa 30")
            Integer floorsBelow,

            @Size(max = 200, message = "Chủ đầu tư tối đa 200 ký tự")
            String investor,

            @Pattern(regexp = "^$|^[0-9+()\\s.-]{6,20}$", message = "Hotline không đúng định dạng")
            String hotline,

            @Email(message = "Email BQL không đúng định dạng")
            @Size(max = 150, message = "Email BQL tối đa 150 ký tự")
            String managementEmail,

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

    public record Filter(
            String keyword,
            String code,
            String name,
            String location,
            BuildingType type,
            ActiveStatus status,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    public record Summary(
            Long id,
            String code,
            String name,
            String fullAddress,
            BuildingType type,
            long apartmentCount,
            Integer floorsAbove,
            Integer floorsBelow,
            ActiveStatus status,
            String coverImageUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
    }

    public record Response(
            Long id,
            String code,
            String name,
            String province,
            String ward,
            String addressDetail,
            String fullAddress,
            BuildingType type,
            long apartmentCount,
            long residentCount,
            long occupiedApartmentCount,
            Integer floorsAbove,
            Integer floorsBelow,
            String investor,
            String hotline,
            String managementEmail,
            String description,
            ActiveStatus status,
            List<ImageResponse> images,
            String coverImageUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }

    /** Cho bộ chọn tòa nhà ở header. */
    public record Option(Long id, String code, String name, String address, String coverImageUrl, ActiveStatus status) {
    }
}
