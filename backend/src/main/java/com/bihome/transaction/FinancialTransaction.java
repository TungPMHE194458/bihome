package com.bihome.transaction;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.Resident;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/**
 * Giao dịch phát sinh từ một nguồn (đăng ký tiện ích, đơn dịch vụ, thẻ từ, thông báo phí) — mỗi nguồn tối đa một
 * giao dịch. Trạng thái do nghiệp vụ của nguồn quyết định (thanh toán, huỷ, hoàn tiền); màn hình giao dịch chỉ đọc.
 * Có lịch sử hoạt động riêng (thu tiền / huỷ / hoàn ghi ở đây, nguồn có thể không đổi gì).
 */
@Getter
@Setter
@AuditTrail(module = "TRANSACTION", type = "FINANCIAL_TRANSACTION", label = "code")
@Entity
@Table(name = "FINANCIAL_TRANSACTION")
public class FinancialTransaction extends BuildingScopedEntity {

    public enum SourceType { AMENITY_BOOKING, SERVICE_ORDER, ACCESS_CARD, FEE_NOTICE }

    public enum Method { CASH, BANK_TRANSFER, VIETQR, CARD }

    /** PENDING chưa thanh toán (Phase 14 cộng vào thông báo phí kỳ sau). */
    public enum Status { PENDING, PAID, CANCELLED, REFUNDED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20, updatable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "SOURCE_TYPE", nullable = false, length = 20, updatable = false)
    private SourceType sourceType;

    @Column(name = "SOURCE_ID", nullable = false, updatable = false)
    private Long sourceId;

    @Column(name = "SOURCE_CODE", nullable = false, length = 40)
    private String sourceCode;

    @Column(name = "APARTMENT_ID")
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "RESIDENT_ID")
    private Long residentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RESIDENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Resident resident;

    @Column(name = "AMOUNT", nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "METHOD", length = 20)
    private Method method;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "DESCRIPTION", length = 500)
    private String description;

    @Column(name = "PAID_AT")
    private OffsetDateTime paidAt;

    /** Khoản chưa thanh toán đã đưa vào thông báo phí (thu qua thông báo phí, không thu riêng). */
    @Column(name = "FEE_NOTICE_ID")
    private Long feeNoticeId;
}
