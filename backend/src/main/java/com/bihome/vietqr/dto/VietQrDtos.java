package com.bihome.vietqr.dto;

import com.bihome.vietqr.BankTransaction.MatchStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class VietQrDtos {

    private VietQrDtos() {
    }

    public record Request(
            @NotBlank(message = "Vui lòng chọn ngân hàng")
            @Pattern(regexp = "^\\d{6}$", message = "Mã BIN ngân hàng gồm 6 chữ số") String bankBin,
            @NotBlank(message = "Số tài khoản không được để trống")
            @Pattern(regexp = "^[0-9A-Za-z]{4,19}$", message = "Số tài khoản 4–19 ký tự, chỉ gồm chữ và số") String accountNo,
            @NotBlank(message = "Tên chủ tài khoản không được để trống")
            @Size(max = 50, message = "Tên chủ tài khoản tối đa 50 ký tự") String accountName,
            @NotBlank(message = "Mẫu nội dung không được để trống")
            @Size(max = 50, message = "Mẫu nội dung tối đa 50 ký tự") String contentTemplate,
            boolean enabled,
            Long version) {
    }

    /**
     * @param version null = tòa chưa cấu hình
     * @param sampleContent nội dung chuyển khoản mẫu với một mã thông báo ví dụ
     */
    public record Response(
            Long buildingId,
            String buildingName,
            String bankBin,
            String accountNo,
            String accountName,
            String contentTemplate,
            boolean enabled,
            String sampleContent,
            String webhookPath,
            boolean simulationEnabled,
            Long version) {
    }

    /** Giả lập ngân hàng báo có tiền vào cho một thông báo phí (chỉ bật ở môi trường thử). */
    public record SimulateRequest(
            @NotNull(message = "Vui lòng chọn thông báo phí") Long feeNoticeId,
            /** Bỏ trống = đúng số còn nợ. */
            @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0") BigDecimal amount,
            /** Bỏ trống = nội dung theo mẫu. */
            @Size(max = 200, message = "Nội dung tối đa 200 ký tự") String content) {
    }

    /** Dữ liệu webhook ngân hàng gửi sang (định dạng chung, bộ chuyển đổi của từng ngân hàng map về đây). */
    public record WebhookEvent(
            @NotBlank(message = "Thiếu mã tham chiếu giao dịch") @Size(max = 100, message = "Mã tham chiếu quá dài")
            String reference,
            @Size(max = 19, message = "Số tài khoản quá dài") String accountNo,
            @NotNull(message = "Thiếu số tiền") @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0") BigDecimal amount,
            @Size(max = 500, message = "Nội dung quá dài") String content,
            OffsetDateTime transactedAt) {
    }

    public enum WebhookStatus { MATCHED, MISMATCHED, UNMATCHED, DUPLICATE }

    public record WebhookResult(WebhookStatus status, Long bankTransactionId, String feeNoticeCode, String paymentCode,
                                String message) {
    }

    public record BankTransactionFilter(
            String keyword,
            Long buildingId,
            MatchStatus matchStatus,
            LocalDate from,
            LocalDate to) {
    }

    public record BankTransactionResponse(
            Long id,
            Long buildingId,
            String bankReference,
            String accountNo,
            BigDecimal amount,
            String content,
            OffsetDateTime transactedAt,
            MatchStatus matchStatus,
            String matchNote,
            Long feeNoticeId,
            String feeNoticeCode,
            Long paymentId,
            String paymentCode,
            boolean simulated,
            OffsetDateTime createdAt) {
    }
}
