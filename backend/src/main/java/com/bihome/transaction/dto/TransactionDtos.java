package com.bihome.transaction.dto;

import com.bihome.transaction.FinancialTransaction.Method;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.transaction.FinancialTransaction.Status;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class TransactionDtos {

    private TransactionDtos() {
    }

    /** @param apartment mã căn hộ (chứa) */
    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            SourceType sourceType,
            String sourceCode,
            Long apartmentId,
            String apartment,
            Method method,
            Status status,
            LocalDate from,
            LocalDate to) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            SourceType sourceType,
            Long sourceId,
            String sourceCode,
            Long apartmentId,
            String apartmentCode,
            Long residentId,
            String residentName,
            BigDecimal amount,
            Method method,
            Status status,
            String description,
            OffsetDateTime paidAt,
            OffsetDateTime createdAt,
            String createdBy,
            /** Đã đưa vào thông báo phí này (thu qua thông báo phí). */
            Long feeNoticeId) {
    }

    /** Ghi nhận thanh toán cho đăng ký tiện ích / đơn dịch vụ. */
    public record PayRequest(@NotNull(message = "Vui lòng chọn phương thức thanh toán") Method method) {
    }

    /** Tóm tắt giao dịch gắn kèm nguồn (đăng ký, đơn dịch vụ). */
    /** @param feeNoticeId khác null = đã đưa vào thông báo phí, không thu riêng được */
    public record Summary(Long id, String code, Status status, Method method, OffsetDateTime paidAt, Long feeNoticeId) {
    }
}
