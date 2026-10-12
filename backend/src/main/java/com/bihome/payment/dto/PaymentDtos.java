package com.bihome.payment.dto;

import com.bihome.payment.Payment.Method;
import com.bihome.payment.Payment.ReconcileStatus;
import com.bihome.payment.Payment.Status;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class PaymentDtos {

    private PaymentDtos() {
    }

    /** Ghi nhận thanh toán thủ công cho một thông báo phí; số tiền không vượt số còn nợ. */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn thông báo phí") Long feeNoticeId,
            @NotNull(message = "Số tiền không được để trống")
            @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0")
            @DecimalMax(value = "999999999999", message = "Số tiền quá lớn")
            BigDecimal amount,
            @NotNull(message = "Vui lòng chọn phương thức") Method method,
            /** Bỏ trống = bây giờ. */
            OffsetDateTime paidAt,
            @Size(max = 150, message = "Tên người nộp tối đa 150 ký tự") String payerName,
            @Size(max = 100, message = "Mã giao dịch ngân hàng tối đa 100 ký tự") String bankReference,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note) {
    }

    public record CancelRequest(
            @NotBlank(message = "Vui lòng nhập lý do huỷ phiếu") @Size(max = 500, message = "Lý do tối đa 500 ký tự")
            String reason,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    /** Đối soát phiếu chuyển khoản nhập tay: MATCHED đã khớp sao kê, MISMATCHED lệch. */
    public record ReconcileRequest(
            @NotNull(message = "Vui lòng chọn kết quả đối soát") ReconcileStatus status,
            @Size(max = 100, message = "Mã giao dịch ngân hàng tối đa 100 ký tự") String bankReference,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            Long feeNoticeId,
            String feeNotice,
            Long apartmentId,
            String apartment,
            Method method,
            ReconcileStatus reconcileStatus,
            Status status,
            LocalDate from,
            LocalDate to) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            Long feeNoticeId,
            String feeNoticeCode,
            String period,
            Long apartmentId,
            String apartmentCode,
            BigDecimal amount,
            Method method,
            OffsetDateTime paidAt,
            String collectorName,
            String payerName,
            String bankReference,
            ReconcileStatus reconcileStatus,
            String note,
            Status status,
            String cancelReason,
            OffsetDateTime cancelledAt,
            String cancelledBy,
            OffsetDateTime createdAt,
            String createdBy,
            Long version) {
    }
}
