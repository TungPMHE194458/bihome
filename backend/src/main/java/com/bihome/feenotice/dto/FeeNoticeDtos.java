package com.bihome.feenotice.dto;

import com.bihome.common.util.BillingPeriods;
import com.bihome.feenotice.FeeNotice.ItemType;
import com.bihome.feenotice.FeeNotice.Status;
import com.bihome.payment.Payment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

public final class FeeNoticeDtos {

    private FeeNoticeDtos() {
    }

    /**
     * Tạo hàng loạt cho tòa đang chọn. {@code dueDate} bỏ trống = ngày hạn trong cấu hình đơn giá; {@code floor} /
     * {@code apartmentIds} để giới hạn phạm vi (bỏ trống = mọi căn đang hoạt động).
     */
    public record GenerateRequest(
            @NotNull(message = "Vui lòng chọn kỳ")
            @Pattern(regexp = BillingPeriods.PATTERN, message = "Kỳ không hợp lệ (định dạng yyyy-MM)")
            String period,
            LocalDate dueDate,
            String floor,
            @Size(max = 2000, message = "Chọn quá nhiều căn hộ") Set<Long> apartmentIds) {
    }

    public record PreviewRow(
            Long apartmentId,
            String apartmentCode,
            String floorNo,
            String holderName,
            List<ItemResponse> items,
            BigDecimal total,
            List<String> warnings,
            /** Khác null = không tạo (đã có thông báo kỳ này / không có khoản nào). */
            String skipReason) {
    }

    public record Preview(
            String period,
            LocalDate dueDate,
            int apartmentCount,
            int toCreate,
            int skipped,
            int withWarnings,
            BigDecimal total,
            List<PreviewRow> rows) {
    }

    public record GenerateResult(String period, int created, int skipped) {
    }

    public record ItemRequest(
            @NotNull(message = "Thiếu loại khoản") ItemType type,
            @NotBlank(message = "Nội dung khoản không được để trống") @Size(max = 300, message = "Nội dung tối đa 300 ký tự")
            String description,
            @DecimalMin(value = "0", message = "Số lượng không được âm") @DecimalMax(value = "9999999999", message = "Số lượng quá lớn")
            BigDecimal quantity,
            @DecimalMin(value = "0", message = "Đơn giá không được âm") @DecimalMax(value = "999999999999", message = "Đơn giá quá lớn")
            BigDecimal unitPrice,
            @DecimalMin(value = "-999999999999", message = "Số tiền không hợp lệ")
            @DecimalMax(value = "999999999999", message = "Số tiền quá lớn")
            BigDecimal amount,
            /** Mã giao dịch (SERVICE) / mã thông báo cũ (PREVIOUS_DEBT): giữ nguyên số tiền theo nguồn. */
            String sourceRef) {
    }

    /** Sửa thông báo nháp: dòng VAT tính lại tự động; dòng tiện ích / nợ kỳ trước chỉ được bỏ, không sửa tiền. */
    public record UpdateRequest(
            @NotNull(message = "Hạn thanh toán không được để trống") LocalDate dueDate,
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note,
            @NotNull(message = "Thiếu danh sách khoản") @Size(max = 100, message = "Tối đa 100 khoản")
            List<@Valid ItemRequest> items,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record VersionRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record CancelRequest(
            @NotBlank(message = "Vui lòng nhập lý do huỷ") @Size(max = 500, message = "Lý do tối đa 500 ký tự") String reason,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    /** Phát hành mọi thông báo nháp của kỳ trong tòa đang chọn. */
    public record IssueAllRequest(
            @NotNull(message = "Vui lòng chọn kỳ")
            @Pattern(regexp = BillingPeriods.PATTERN, message = "Kỳ không hợp lệ (định dạng yyyy-MM)")
            String period) {
    }

    public record IssueAllResult(int issued, int failed, List<String> errors) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            String period,
            Long apartmentId,
            String apartment,
            Status status,
            /** true = còn nợ (đã phát hành, chưa thu đủ, chưa chuyển nợ). */
            Boolean unpaid,
            LocalDate dueFrom,
            LocalDate dueTo) {
    }

    public record ItemResponse(
            ItemType type,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal amount,
            String sourceRef) {
    }

    public record Summary(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            String period,
            Long apartmentId,
            String apartmentCode,
            String holderName,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal outstanding,
            LocalDate dueDate,
            Status status,
            Long carriedToId,
            String carriedToCode,
            OffsetDateTime issuedAt,
            OffsetDateTime createdAt,
            Long version) {
    }

    public record PaymentItem(
            Long id,
            String code,
            BigDecimal amount,
            Payment.Method method,
            OffsetDateTime paidAt,
            String collectorName,
            Payment.ReconcileStatus reconcileStatus,
            Payment.Status status) {
    }

    public record Link(Long id, String code, String period) {
    }

    public record Response(
            Summary summary,
            String floorNo,
            String buildingAddress,
            BigDecimal vatPercent,
            List<ItemResponse> items,
            String note,
            String issuedBy,
            String cancelReason,
            List<PaymentItem> payments,
            /** Thông báo cũ đã chuyển nợ vào thông báo này. */
            List<Link> carriedFrom,
            /** Có cấu hình VietQR đang bật và còn nợ → hiện mã QR. */
            boolean vietQrAvailable,
            String transferContent,
            String createdBy,
            OffsetDateTime updatedAt,
            String updatedBy) {
    }

    /** Chuỗi VietQR (EMVCo) để hiện QR cho số còn nợ. */
    public record VietQr(String payload, String bankBin, String accountNo, String accountName, BigDecimal amount,
                         String content) {
    }
}
