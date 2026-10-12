package com.bihome.servicecatalog.dto;

import com.bihome.servicecatalog.ServiceOrder.Status;
import com.bihome.transaction.dto.TransactionDtos;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class ServiceOrderDtos {

    private ServiceOrderDtos() {
    }

    public record Request(
            @NotNull(message = "Vui lòng chọn dịch vụ") Long serviceId,
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            Long residentId,
            @NotNull(message = "Số lượng không được để trống")
            @DecimalMin(value = "0.01", message = "Số lượng phải lớn hơn 0")
            @DecimalMax(value = "99999", message = "Số lượng quá lớn")
            @Digits(integer = 5, fraction = 2, message = "Số lượng tối đa 2 chữ số thập phân")
            BigDecimal quantity,
            OffsetDateTime scheduledAt,
            @Size(max = 30, message = "Mã voucher tối đa 30 ký tự") String voucherCode,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {
    }

    public record QuoteResponse(BigDecimal unitPrice, String unit, BigDecimal amount, String voucherCode,
                                BigDecimal discount, BigDecimal total) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            Long serviceId,
            Long apartmentId,
            String apartment,
            Status status,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            Long serviceId,
            String serviceCode,
            String serviceName,
            Long apartmentId,
            String apartmentCode,
            Long residentId,
            String residentName,
            BigDecimal quantity,
            BigDecimal unitPrice,
            String unit,
            BigDecimal amount,
            String voucherCode,
            BigDecimal discount,
            BigDecimal total,
            OffsetDateTime scheduledAt,
            Status status,
            String note,
            String cancelReason,
            OffsetDateTime completedAt,
            TransactionDtos.Summary transaction,
            OffsetDateTime createdAt,
            String createdBy,
            Long version) {
    }

    public record StatusRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record CancelRequest(
            @NotBlank(message = "Vui lòng nhập lý do huỷ") @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }
}
