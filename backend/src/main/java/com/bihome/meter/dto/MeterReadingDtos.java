package com.bihome.meter.dto;

import com.bihome.common.util.BillingPeriods;
import com.bihome.meter.MeterReading.MeterType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class MeterReadingDtos {

    private MeterReadingDtos() {
    }

    /**
     * Thêm số liệu. {@code oldIndex} chỉ dùng khi căn chưa có kỳ nào trước (đồng hồ mới); có kỳ trước thì lấy chỉ số
     * mới của kỳ liền trước.
     */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Vui lòng chọn kỳ")
            @Pattern(regexp = BillingPeriods.PATTERN, message = "Kỳ không hợp lệ (định dạng yyyy-MM)")
            String period,
            @NotNull(message = "Vui lòng chọn loại đồng hồ") MeterType meterType,
            @DecimalMin(value = "0", message = "Chỉ số cũ không được âm")
            @DecimalMax(value = "9999999999", message = "Chỉ số quá lớn")
            BigDecimal oldIndex,
            @NotNull(message = "Chỉ số mới không được để trống")
            @DecimalMin(value = "0", message = "Chỉ số mới không được âm")
            @DecimalMax(value = "9999999999", message = "Chỉ số quá lớn")
            BigDecimal newIndex,
            Long imageFileId,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {
    }

    public record UpdateRequest(
            @DecimalMin(value = "0", message = "Chỉ số cũ không được âm")
            @DecimalMax(value = "9999999999", message = "Chỉ số quá lớn")
            BigDecimal oldIndex,
            @NotNull(message = "Chỉ số mới không được để trống")
            @DecimalMin(value = "0", message = "Chỉ số mới không được âm")
            @DecimalMax(value = "9999999999", message = "Chỉ số quá lớn")
            BigDecimal newIndex,
            Long imageFileId,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String period,
            Long apartmentId,
            String apartment,
            String floor,
            MeterType meterType,
            /** true = chỉ số liệu tăng bất thường (> 200% so với trung bình 3 kỳ trước). */
            Boolean spike) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            Long apartmentId,
            String apartmentCode,
            String floorNo,
            String period,
            MeterType meterType,
            BigDecimal oldIndex,
            BigDecimal newIndex,
            BigDecimal consumption,
            BigDecimal averageConsumption,
            boolean spike,
            /** Kỳ đã có thông báo phí phát hành → không sửa / xoá được. */
            boolean locked,
            /** Đây là kỳ đầu của đồng hồ → được nhập chỉ số cũ. */
            boolean firstReading,
            Long imageFileId,
            String imageUrl,
            String note,
            String createdBy,
            OffsetDateTime createdAt,
            String updatedBy,
            OffsetDateTime updatedAt,
            Long version) {
    }

    /** Gợi ý cho form thêm: chỉ số cũ lấy từ kỳ trước, trung bình 3 kỳ để cảnh báo ngay khi nhập. */
    public record PreviousInfo(
            BigDecimal oldIndex,
            String previousPeriod,
            BigDecimal averageConsumption,
            boolean locked,
            Long existingId) {
    }

    // ---------------------------------------------------------------- Lưới nhập nhanh theo tầng

    public record SheetRow(
            Long apartmentId,
            String apartmentCode,
            String floorNo,
            BigDecimal oldIndex,
            String previousPeriod,
            BigDecimal averageConsumption,
            Long readingId,
            BigDecimal newIndex,
            BigDecimal consumption,
            boolean spike,
            boolean locked,
            Long version) {
    }

    public record Sheet(String period, MeterType meterType, List<String> floors, List<SheetRow> rows) {
    }

    /** {@code newIndex} null = bỏ qua dòng (chưa đọc được đồng hồ). */
    public record SheetEntry(
            @NotNull(message = "Thiếu căn hộ") Long apartmentId,
            @DecimalMin(value = "0", message = "Chỉ số cũ không được âm") BigDecimal oldIndex,
            @DecimalMin(value = "0", message = "Chỉ số mới không được âm")
            @DecimalMax(value = "9999999999", message = "Chỉ số quá lớn")
            BigDecimal newIndex) {
    }

    public record SheetRequest(
            @NotNull(message = "Vui lòng chọn kỳ")
            @Pattern(regexp = BillingPeriods.PATTERN, message = "Kỳ không hợp lệ (định dạng yyyy-MM)")
            String period,
            @NotNull(message = "Vui lòng chọn loại đồng hồ") MeterType meterType,
            @NotEmpty(message = "Không có dòng nào để lưu") @Size(max = 1000, message = "Tối đa 1000 dòng mỗi lần")
            List<@Valid SheetEntry> rows) {
    }

    public record SheetResult(int created, int updated, int unchanged) {
    }
}
