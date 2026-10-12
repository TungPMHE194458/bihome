package com.bihome.feenotice;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * Thông báo phí của căn hộ theo kỳ. Nháp → Phát hành → (Thanh toán một phần / Quá hạn) → Đã thanh toán; Huỷ khi
 * chưa có phiếu thu. Các khoản là danh sách giá trị (gán danh sách mới khi sửa).
 */
@Getter
@Setter
@AuditTrail(module = "FEE_NOTICE", type = "FEE_NOTICE", label = "code")
@Entity
@Table(name = "FEE_NOTICE")
public class FeeNotice extends BuildingScopedEntity {

    public enum Status { DRAFT, ISSUED, PARTIAL, PAID, OVERDUE, CANCELLED }

    /** Thứ tự khai báo = thứ tự nhóm trên thông báo phí. */
    public enum ItemType { MANAGEMENT, ELECTRIC, WATER, PARKING, OTHER, VAT, SERVICE, PREVIOUS_DEBT, DISCOUNT }

    /** Đã phát hành và còn thu được. */
    public static final Set<Status> COLLECTIBLE = EnumSet.of(Status.ISSUED, Status.PARTIAL, Status.OVERDUE);

    /** Các khoản chịu VAT. */
    public static final Set<ItemType> TAXABLE = EnumSet.of(ItemType.MANAGEMENT, ItemType.ELECTRIC, ItemType.WATER,
            ItemType.PARKING, ItemType.OTHER);

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20, updatable = false)
    private String code;

    @Column(name = "BILLING_PERIOD", nullable = false, length = 7, updatable = false)
    private String billingPeriod;

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "HOLDER_NAME", length = 150)
    private String holderName;

    @Column(name = "VAT_PERCENT", nullable = false)
    private BigDecimal vatPercent = BigDecimal.ZERO;

    @Column(name = "TOTAL_AMOUNT", nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "PAID_AMOUNT", nullable = false)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "DUE_DATE", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "ISSUED_AT")
    private OffsetDateTime issuedAt;

    @Column(name = "ISSUED_BY", length = 100)
    private String issuedBy;

    @Column(name = "CARRIED_TO_ID")
    private Long carriedToId;

    @Column(name = "CANCEL_REASON", length = 500)
    private String cancelReason;

    @Column(name = "NOTE", length = 1000)
    private String note;

    @ElementCollection
    @CollectionTable(name = "FEE_NOTICE_ITEM", joinColumns = @JoinColumn(name = "FEE_NOTICE_ID"))
    @OrderColumn(name = "LINE_NO")
    @BatchSize(size = 50)
    private List<Item> items = new ArrayList<>();

    /** Còn phải thu (không âm); nháp / huỷ / đã chuyển nợ sang thông báo khác thì 0. */
    public BigDecimal outstanding() {
        if (carriedToId != null || status == Status.DRAFT || status == Status.CANCELLED) {
            return BigDecimal.ZERO;
        }
        BigDecimal rest = totalAmount.subtract(paidAmount);
        return rest.signum() > 0 ? rest : BigDecimal.ZERO;
    }

    /** Trạng thái theo số đã thu và hạn thanh toán (chỉ dùng cho thông báo đã phát hành). */
    public Status collectedStatus(LocalDate today) {
        if (paidAmount.compareTo(totalAmount) >= 0) {
            return Status.PAID;
        }
        if (dueDate.isBefore(today)) {
            return Status.OVERDUE;
        }
        return paidAmount.signum() > 0 ? Status.PARTIAL : Status.ISSUED;
    }

    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        @Enumerated(EnumType.STRING)
        @Column(name = "ITEM_TYPE", nullable = false, length = 20)
        private ItemType type;

        @Column(name = "DESCRIPTION", nullable = false, length = 300)
        private String description;

        @Column(name = "QUANTITY")
        private BigDecimal quantity;

        @Column(name = "UNIT_PRICE")
        private BigDecimal unitPrice;

        @Column(name = "AMOUNT", nullable = false)
        private BigDecimal amount;

        @Column(name = "SOURCE_REF", length = 40)
        private String sourceRef;
    }
}
