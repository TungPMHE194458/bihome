package com.bihome.booking;

import com.bihome.amenity.Amenity;
import com.bihome.amenity.AmenityConfig.PriceUnit;
import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.common.entity.HhmmTimeConverter;
import com.bihome.resident.Resident;
import com.bihome.voucher.Voucher;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/** Đăng ký sử dụng một khung giờ của tiện ích cho căn hộ. */
@Getter
@Setter
@AuditTrail(module = "AMENITY_BOOKING", type = "AMENITY_BOOKING", label = "code")
@Entity
@Table(name = "AMENITY_BOOKING")
public class AmenityBooking extends BuildingScopedEntity {

    /**
     * Chờ duyệt → Đã duyệt / Từ chối; Chờ duyệt / Đã duyệt → Đã huỷ; Đã duyệt → Hoàn thành (sau giờ bắt đầu, job tự
     * chuyển khi hết giờ).
     */
    public enum Status {
        PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED;

        /** Đang giữ chỗ: tính vào sức chứa và giới hạn lượt / tuần. */
        public static final Set<Status> HOLDING = EnumSet.of(PENDING, APPROVED, COMPLETED);

        public boolean isOpen() {
            return this == PENDING || this == APPROVED;
        }
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20, updatable = false)
    private String code;

    @Column(name = "AMENITY_ID", nullable = false, updatable = false)
    private Long amenityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AMENITY_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Amenity amenity;

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

    @Column(name = "BOOKING_DATE", nullable = false, updatable = false)
    private LocalDate bookingDate;

    @Convert(converter = HhmmTimeConverter.class)
    @Column(name = "START_TIME", nullable = false, updatable = false, length = 5)
    private LocalTime startTime;

    @Convert(converter = HhmmTimeConverter.class)
    @Column(name = "END_TIME", nullable = false, updatable = false, length = 5)
    private LocalTime endTime;

    @Column(name = "PEOPLE_COUNT", nullable = false, updatable = false)
    private int peopleCount;

    @Column(name = "UNIT_PRICE", nullable = false, updatable = false)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "PRICE_UNIT", updatable = false, length = 20)
    private PriceUnit priceUnit;

    @Column(name = "FEE", nullable = false, updatable = false)
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(name = "VOUCHER_ID", updatable = false)
    private Long voucherId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "VOUCHER_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Voucher voucher;

    @Column(name = "DISCOUNT", nullable = false, updatable = false)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "TOTAL", nullable = false, updatable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "NOTE", length = 500)
    private String note;

    @Column(name = "REJECT_REASON", length = 500)
    private String rejectReason;

    @Column(name = "CANCEL_REASON", length = 500)
    private String cancelReason;

    @Column(name = "DECIDED_AT")
    private OffsetDateTime decidedAt;

    @Column(name = "DECIDED_BY", length = 100)
    private String decidedBy;

    @Column(name = "CANCELLED_AT")
    private OffsetDateTime cancelledAt;

    @Column(name = "COMPLETED_AT")
    private OffsetDateTime completedAt;
}
