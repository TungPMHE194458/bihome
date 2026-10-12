package com.bihome.meter;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/** Chỉ số đồng hồ điện / nước của căn hộ trong một kỳ (yyyy-MM). */
@Getter
@Setter
@AuditTrail(module = "METER_READING", type = "METER_READING", label = {"apartment", "billingPeriod", "meterType"},
        ignore = {"averageConsumption"})
@Entity
@Table(name = "METER_READING")
public class MeterReading extends BuildingScopedEntity {

    public enum MeterType { ELECTRIC, WATER }

    /** Tiêu thụ kỳ này vượt quá số lần trung bình 3 kỳ trước thì cảnh báo (tăng > 200%). */
    public static final BigDecimal SPIKE_RATIO = BigDecimal.valueOf(3);

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "BILLING_PERIOD", nullable = false, length = 7, updatable = false)
    private String billingPeriod;

    @Enumerated(EnumType.STRING)
    @Column(name = "METER_TYPE", nullable = false, length = 10, updatable = false)
    private MeterType meterType;

    @Column(name = "OLD_INDEX", nullable = false)
    private BigDecimal oldIndex;

    @Column(name = "NEW_INDEX", nullable = false)
    private BigDecimal newIndex;

    @Column(name = "CONSUMPTION", nullable = false)
    private BigDecimal consumption;

    @Column(name = "AVERAGE_CONSUMPTION")
    private BigDecimal averageConsumption;

    @Column(name = "IMAGE_FILE_ID")
    private Long imageFileId;

    @Column(name = "NOTE", length = 500)
    private String note;

    public boolean isSpike() {
        return averageConsumption != null && averageConsumption.signum() > 0
                && consumption.compareTo(averageConsumption.multiply(SPIKE_RATIO)) > 0;
    }
}
