package com.bihome.amenity.dto;

import com.bihome.amenity.AmenityConfig.DayType;
import com.bihome.amenity.AmenityConfig.PriceUnit;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.storage.ImageRef;
import com.bihome.common.storage.ImageResponse;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
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
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

public final class AmenityDtos {

    private AmenityDtos() {
    }

    public record Request(
            @NotBlank(message = "Mã tiện ích không được để trống")
            @Pattern(regexp = "^[A-Za-z0-9_-]{2,30}$", message = "Mã tiện ích 2–30 ký tự, chỉ gồm chữ không dấu, chữ số, _ và -")
            String code,
            @NotBlank(message = "Tên tiện ích không được để trống")
            @Size(max = 150, message = "Tên tiện ích tối đa 150 ký tự")
            String name,
            @Size(max = 200, message = "Vị trí tối đa 200 ký tự") String location,
            @NotNull(message = "Sức chứa không được để trống")
            @Min(value = 1, message = "Sức chứa tối thiểu 1 người")
            @Max(value = 99999, message = "Sức chứa quá lớn")
            Integer capacity,
            @NotNull(message = "Giờ mở cửa không được để trống") @JsonFormat(pattern = "HH:mm") LocalTime openTime,
            @NotNull(message = "Giờ đóng cửa không được để trống") @JsonFormat(pattern = "HH:mm") LocalTime closeTime,
            @Size(max = 4000, message = "Nội quy tối đa 4000 ký tự") String rules,
            boolean requiresApproval,
            @NotNull(message = "Vui lòng chọn trạng thái") ActiveStatus status,
            @Size(max = 20, message = "Tối đa 20 ảnh") List<@Valid ImageRef> images,
            Long version) {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") ActiveStatus status) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String name,
            String location,
            Boolean requiresApproval,
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
            String location,
            int capacity,
            @JsonFormat(pattern = "HH:mm") LocalTime openTime,
            @JsonFormat(pattern = "HH:mm") LocalTime closeTime,
            String rules,
            boolean requiresApproval,
            ActiveStatus status,
            List<ImageResponse> images,
            String coverImageUrl,
            /** Số khung giờ đã cấu hình; 0 = chưa mở đặt chỗ. */
            long slotCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            Long version) {
    }

    public record Option(Long id, String code, String name, Long buildingId, ActiveStatus status) {
    }

    // ---------- Cấu hình ----------

    public record SlotDto(
            @NotNull @Min(value = 1, message = "Thứ từ 1 (Thứ 2) đến 7 (Chủ nhật)") @Max(value = 7, message = "Thứ từ 1 (Thứ 2) đến 7 (Chủ nhật)")
            Integer dayOfWeek,
            @NotNull(message = "Giờ bắt đầu không được để trống") @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull(message = "Giờ kết thúc không được để trống") @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            @Min(value = 1, message = "Sức chứa khung giờ tối thiểu 1") @Max(value = 99999, message = "Sức chứa quá lớn")
            Integer capacity) {
    }

    public record PriceDto(
            @NotNull(message = "Vui lòng chọn loại ngày") DayType dayType,
            @NotNull(message = "Giờ bắt đầu không được để trống") @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @NotNull(message = "Giờ kết thúc không được để trống") @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            @NotNull(message = "Giá không được để trống")
            @DecimalMin(value = "0", message = "Giá không được âm")
            @Digits(integer = 12, fraction = 0, message = "Giá là số nguyên (VND)")
            BigDecimal price,
            @NotNull(message = "Vui lòng chọn cách tính giá") PriceUnit priceUnit) {
    }

    public record MaintenanceDto(
            @NotNull(message = "Ngày bắt đầu không được để trống") LocalDate startDate,
            @NotNull(message = "Ngày kết thúc không được để trống") LocalDate endDate,
            @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason) {
    }

    /** Lưu toàn bộ cấu hình (thay danh sách khung giờ, giá, ngày bảo trì). */
    public record ConfigRequest(
            @NotNull(message = "Thời lượng mỗi lượt không được để trống")
            @Min(value = 15, message = "Thời lượng mỗi lượt tối thiểu 15 phút")
            @Max(value = 720, message = "Thời lượng mỗi lượt tối đa 720 phút")
            Integer slotMinutes,
            @Min(value = 1, message = "Số lượt mỗi tuần tối thiểu 1") @Max(value = 999, message = "Số lượt mỗi tuần quá lớn")
            Integer maxBookingsPerWeek,
            @NotNull(message = "Số ngày đặt trước không được để trống")
            @Min(value = 1, message = "Đặt trước tối thiểu 1 ngày") @Max(value = 365, message = "Đặt trước tối đa 365 ngày")
            Integer maxAdvanceDays,
            @NotNull(message = "Thời gian huỷ miễn phí không được để trống")
            @Min(value = 0, message = "Thời gian huỷ miễn phí không được âm") @Max(value = 720, message = "Tối đa 720 giờ")
            Integer freeCancelHours,
            @Size(max = 500, message = "Tối đa 500 khung giờ") List<@Valid @NotNull SlotDto> slots,
            @Size(max = 100, message = "Tối đa 100 mức giá") List<@Valid @NotNull PriceDto> prices,
            @Size(max = 100, message = "Tối đa 100 đợt bảo trì") List<@Valid @NotNull MaintenanceDto> maintenances,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record ConfigResponse(
            Long amenityId,
            String amenityCode,
            String amenityName,
            int capacity,
            @JsonFormat(pattern = "HH:mm") LocalTime openTime,
            @JsonFormat(pattern = "HH:mm") LocalTime closeTime,
            int slotMinutes,
            Integer maxBookingsPerWeek,
            int maxAdvanceDays,
            int freeCancelHours,
            List<SlotDto> slots,
            List<PriceDto> prices,
            List<MaintenanceDto> maintenances,
            OffsetDateTime updatedAt,
            String updatedBy,
            Long version) {
    }
}
