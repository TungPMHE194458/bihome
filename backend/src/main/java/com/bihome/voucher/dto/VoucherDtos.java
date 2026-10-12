package com.bihome.voucher.dto;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.Voucher.DiscountType;
import com.bihome.voucher.Voucher.Validity;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class VoucherDtos {

    private VoucherDtos() {
    }

    /**
     * @param discountValue PERCENT: 1–100 (%); AMOUNT: số tiền VND
     * @param maxDiscount   chỉ với PERCENT; bỏ trống = không giới hạn
     * @param totalQuantity bỏ trống = không giới hạn số lượt
     */
    public record Request(
            @NotBlank(message = "Mã voucher không được để trống")
            @Pattern(regexp = "^[A-Za-z0-9_-]{3,30}$", message = "Mã voucher 3–30 ký tự, chỉ gồm chữ không dấu, chữ số, _ và -")
            String code,
            @NotBlank(message = "Tên voucher không được để trống")
            @Size(max = 150, message = "Tên voucher tối đa 150 ký tự")
            String name,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự") String description,
            @NotNull(message = "Vui lòng chọn loại giảm") DiscountType discountType,
            @NotNull(message = "Giá trị giảm không được để trống")
            @DecimalMin(value = "0.01", message = "Giá trị giảm phải lớn hơn 0")
            @Digits(integer = 10, fraction = 2, message = "Giá trị giảm không hợp lệ")
            BigDecimal discountValue,
            @DecimalMin(value = "1", message = "Giảm tối đa phải lớn hơn 0")
            @Digits(integer = 12, fraction = 0, message = "Giảm tối đa là số nguyên (VND)")
            BigDecimal maxDiscount,
            @NotNull(message = "Vui lòng chọn phạm vi áp dụng") ApplyScope applyScope,
            /** Tiện ích cụ thể; rỗng = mọi tiện ích trong phạm vi. */
            @Size(max = 100, message = "Tối đa 100 tiện ích") List<@NotNull Long> amenityIds,
            /** Dịch vụ cụ thể; rỗng = mọi dịch vụ trong phạm vi. */
            @Size(max = 100, message = "Tối đa 100 dịch vụ") List<@NotNull Long> serviceIds,
            @Min(value = 1, message = "Tổng số lượng tối thiểu 1")
            @Max(value = 1_000_000_000, message = "Tổng số lượng quá lớn")
            Integer totalQuantity,
            @Min(value = 1, message = "Giới hạn mỗi căn hộ tối thiểu 1")
            @Max(value = 1_000_000_000, message = "Giới hạn mỗi căn hộ quá lớn")
            Integer perApartmentLimit,
            @NotNull(message = "Ngày bắt đầu hiệu lực không được để trống") LocalDate validFrom,
            @NotNull(message = "Ngày kết thúc hiệu lực không được để trống") LocalDate validTo,
            @NotNull(message = "Vui lòng chọn trạng thái") ActiveStatus status,
            Long version) {
    }

    /** Tiện ích / dịch vụ voucher áp dụng. */
    public record Target(Long id, String code, String name) {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    /**
     * {@code validFrom/validTo}: voucher có hiệu lực giao với khoảng này.
     * {@code validity}: theo ngày hôm nay (sắp diễn ra / đang hiệu lực / hết hạn).
     */
    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String name,
            DiscountType discountType,
            ApplyScope applyScope,
            ActiveStatus status,
            Validity validity,
            LocalDate validFrom,
            LocalDate validTo,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            String name,
            String description,
            DiscountType discountType,
            BigDecimal discountValue,
            BigDecimal maxDiscount,
            ApplyScope applyScope,
            List<Target> amenities,
            List<Target> services,
            Integer totalQuantity,
            int usedCount,
            Integer remaining,
            boolean soldOut,
            Integer perApartmentLimit,
            LocalDate validFrom,
            LocalDate validTo,
            Validity validity,
            ActiveStatus status,
            /** Đã có lượt dùng → không sửa được loại/giá trị giảm, phạm vi. */
            boolean valueLocked,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            Long version) {
    }
}
