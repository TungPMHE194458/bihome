package com.bihome.servicecatalog;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.Resident;
import com.bihome.voucher.Voucher;
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

/** Đơn dịch vụ của căn hộ: số lượng × đơn giá tại thời điểm đặt (trừ voucher) → giao dịch. */
@Getter
@Setter
@AuditTrail(module = "SERVICE", type = "SERVICE_ORDER", label = "code")
@Entity
@Table(name = "SERVICE_ORDER")
public class ServiceOrder extends BuildingScopedEntity {

    /** Chờ xác nhận → Đã xác nhận → Hoàn thành; chưa hoàn thành thì huỷ được. */
    public enum Status {
        PENDING, CONFIRMED, COMPLETED, CANCELLED;

        public boolean isOpen() {
            return this == PENDING || this == CONFIRMED;
        }
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20, updatable = false)
    private String code;

    @Column(name = "SERVICE_ID", nullable = false, updatable = false)
    private Long serviceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SERVICE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private ServiceOffering service;

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "RESIDENT_ID", updatable = false)
    private Long residentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RESIDENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Resident resident;

    @Column(name = "QUANTITY", nullable = false, updatable = false)
    private BigDecimal quantity;

    @Column(name = "UNIT_PRICE", nullable = false, updatable = false)
    private BigDecimal unitPrice;

    @Column(name = "UNIT", nullable = false, updatable = false, length = 30)
    private String unit;

    @Column(name = "AMOUNT", nullable = false, updatable = false)
    private BigDecimal amount;

    @Column(name = "VOUCHER_ID", updatable = false)
    private Long voucherId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "VOUCHER_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Voucher voucher;

    @Column(name = "DISCOUNT", nullable = false, updatable = false)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "TOTAL", nullable = false, updatable = false)
    private BigDecimal total;

    @Column(name = "SCHEDULED_AT")
    private OffsetDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "NOTE", length = 500)
    private String note;

    @Column(name = "CANCEL_REASON", length = 500)
    private String cancelReason;

    @Column(name = "COMPLETED_AT")
    private OffsetDateTime completedAt;
}
