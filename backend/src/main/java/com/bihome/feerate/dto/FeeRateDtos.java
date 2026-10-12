package com.bihome.feerate.dto;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.common.entity.ActiveStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public final class FeeRateDtos {

    private FeeRateDtos() {
    }

    public record Request(
            @NotNull(message = "VAT không được để trống")
            @DecimalMin(value = "0", message = "VAT từ 0 đến 100%")
            @DecimalMax(value = "100", message = "VAT từ 0 đến 100%")
            BigDecimal vatPercent,
            @Min(value = 1, message = "Hạn thanh toán từ ngày 1 đến 31")
            @Max(value = 31, message = "Hạn thanh toán từ ngày 1 đến 31")
            int dueDay,
            @Size(max = 20, message = "Quá nhiều loại căn") List<@Valid ManagementRate> managementRates,
            @Size(max = 10, message = "Tối đa 10 bậc giá điện") List<@Valid Tier> electricTiers,
            @Size(max = 10, message = "Tối đa 10 bậc giá nước") List<@Valid Tier> waterTiers,
            @Size(max = 50, message = "Quá nhiều danh mục xe") List<@Valid ParkingRate> parkingRates,
            @Size(max = 20, message = "Tối đa 20 khoản phí khác") List<@Valid OtherCharge> otherCharges,
            Long version) {
    }

    public record ManagementRate(
            @NotNull(message = "Vui lòng chọn loại căn") ApartmentType apartmentType,
            @NotNull(message = "Đơn giá không được để trống") @DecimalMin(value = "0", message = "Đơn giá không được âm")
            BigDecimal unitPrice) {
    }

    /** @param upTo tiêu thụ cộng dồn tối đa của bậc; null = phần còn lại (chỉ bậc cuối) */
    public record Tier(
            @DecimalMin(value = "0", inclusive = false, message = "Mốc bậc phải lớn hơn 0") BigDecimal upTo,
            @NotNull(message = "Đơn giá không được để trống") @DecimalMin(value = "0", message = "Đơn giá không được âm")
            BigDecimal unitPrice) {
    }

    public record ParkingRate(
            @NotNull(message = "Vui lòng chọn danh mục") Long assetCategoryId,
            @NotNull(message = "Đơn giá không được để trống") @DecimalMin(value = "0", message = "Đơn giá không được âm")
            BigDecimal unitPrice) {
    }

    public record OtherCharge(
            @NotBlank(message = "Tên khoản phí không được để trống") @Size(max = 100, message = "Tên tối đa 100 ký tự")
            String name,
            @NotNull(message = "Số tiền không được để trống") @DecimalMin(value = "0", message = "Số tiền không được âm")
            BigDecimal amount) {
    }

    public record Category(Long id, String name, String unit, ActiveStatus status) {
    }

    /** @param version null = tòa chưa lưu cấu hình (đang hiện giá trị mặc định) */
    public record Response(
            Long buildingId,
            String buildingName,
            BigDecimal vatPercent,
            int dueDay,
            List<ManagementRate> managementRates,
            List<Tier> electricTiers,
            List<Tier> waterTiers,
            List<ParkingRate> parkingRates,
            List<OtherCharge> otherCharges,
            /** Danh mục tài sản của tòa (để nhập phí gửi xe theo từng danh mục). */
            List<Category> categories,
            Long version) {
    }
}
