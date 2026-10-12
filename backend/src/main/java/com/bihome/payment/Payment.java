package com.bihome.payment;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.feenotice.FeeNotice;
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

/** Phiếu thu cho một thông báo phí (cho phép trả một phần). Huỷ phiếu cần lý do, không xoá. */
@Getter
@Setter
@AuditTrail(module = "PAYMENT", type = "PAYMENT", label = "code")
@Entity
@Table(name = "PAYMENT")
public class Payment extends BuildingScopedEntity {

    public enum Method { CASH, BANK_TRANSFER, VIETQR }

    public enum ReconcileStatus { MATCHED, PENDING, MISMATCHED }

    public enum Status { VALID, CANCELLED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20, updatable = false)
    private String code;

    @Column(name = "FEE_NOTICE_ID", nullable = false, updatable = false)
    private Long feeNoticeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FEE_NOTICE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private FeeNotice feeNotice;

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "AMOUNT", nullable = false, updatable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "METHOD", nullable = false, length = 20, updatable = false)
    private Method method;

    @Column(name = "PAID_AT", nullable = false)
    private OffsetDateTime paidAt;

    @Column(name = "COLLECTOR_NAME", nullable = false, length = 150)
    private String collectorName;

    @Column(name = "PAYER_NAME", length = 150)
    private String payerName;

    @Column(name = "BANK_REFERENCE", length = 100)
    private String bankReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "RECONCILE_STATUS", nullable = false, length = 20)
    private ReconcileStatus reconcileStatus;

    @Column(name = "NOTE", length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "CANCEL_REASON", length = 500)
    private String cancelReason;

    @Column(name = "CANCELLED_AT")
    private OffsetDateTime cancelledAt;

    @Column(name = "CANCELLED_BY", length = 100)
    private String cancelledBy;
}
