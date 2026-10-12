package com.bihome.voucher;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BuildingScopedEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@AuditTrail(module = "VOUCHER", type = "VOUCHER", label = {"code", "name"}, ignore = "usedCount")
@Entity
@Table(name = "VOUCHER")
public class Voucher extends BuildingScopedEntity {

    public enum DiscountType { PERCENT, AMOUNT }

    public enum ApplyScope { AMENITY, SERVICE, ALL }

    /** Trạng thái hiệu lực tính theo ngày (khác STATUS bật/tắt thủ công). */
    public enum Validity { UPCOMING, VALID, EXPIRED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 30)
    private String code;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;

    @Column(name = "DESCRIPTION", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "DISCOUNT_TYPE", nullable = false, length = 10)
    private DiscountType discountType;

    @Column(name = "DISCOUNT_VALUE", nullable = false)
    private BigDecimal discountValue;

    @Column(name = "MAX_DISCOUNT")
    private BigDecimal maxDiscount;

    @Enumerated(EnumType.STRING)
    @Column(name = "APPLY_SCOPE", nullable = false, length = 20)
    private ApplyScope applyScope;

    @Column(name = "TOTAL_QUANTITY")
    private Integer totalQuantity;

    @Column(name = "USED_COUNT", nullable = false)
    private int usedCount;

    @Column(name = "PER_APARTMENT_LIMIT")
    private Integer perApartmentLimit;

    @Column(name = "VALID_FROM", nullable = false)
    private LocalDate validFrom;

    @Column(name = "VALID_TO", nullable = false)
    private LocalDate validTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    /** Tiện ích cụ thể (phạm vi AMENITY / ALL); rỗng = mọi tiện ích của tòa. Luôn gán tập mới khi sửa. */
    @ElementCollection
    @CollectionTable(name = "VOUCHER_AMENITY", joinColumns = @JoinColumn(name = "VOUCHER_ID"))
    @Column(name = "AMENITY_ID", nullable = false)
    @BatchSize(size = 50)
    private Set<Long> amenityIds = new LinkedHashSet<>();

    /** Dịch vụ cụ thể (phạm vi SERVICE / ALL); rỗng = mọi dịch vụ của tòa. */
    @ElementCollection
    @CollectionTable(name = "VOUCHER_SERVICE", joinColumns = @JoinColumn(name = "VOUCHER_ID"))
    @Column(name = "SERVICE_ID", nullable = false)
    @BatchSize(size = 50)
    private Set<Long> serviceIds = new LinkedHashSet<>();

    public Validity validity(LocalDate today) {
        if (validTo.isBefore(today)) {
            return Validity.EXPIRED;
        }
        return validFrom.isAfter(today) ? Validity.UPCOMING : Validity.VALID;
    }

    public boolean isSoldOut() {
        return totalQuantity != null && usedCount >= totalQuantity;
    }
}
