package com.bihome.feerate;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.AuditableEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * Đơn giá tính thông báo phí của một tòa (khoá chính = BUILDING_ID). Các danh sách là giá trị: luôn gán danh sách
 * mới khi lưu. Bậc điện / nước tách hai bảng vì hai element collection dùng chung bảng sẽ xoá lẫn nhau.
 */
@Getter
@Setter
@AuditTrail(module = "FEE_NOTICE", type = "FEE_RATE_CONFIG", building = true)
@Entity
@Table(name = "FEE_RATE_CONFIG")
public class FeeRateConfig extends AuditableEntity {

    @Id
    @Column(name = "BUILDING_ID")
    private Long buildingId;

    @Column(name = "VAT_PERCENT", nullable = false)
    private BigDecimal vatPercent = BigDecimal.ZERO;

    @Column(name = "DUE_DAY", nullable = false)
    private int dueDay = 15;

    @ElementCollection
    @CollectionTable(name = "FEE_MANAGEMENT_RATE", joinColumns = @JoinColumn(name = "BUILDING_ID"))
    @BatchSize(size = 20)
    private List<ManagementRate> managementRates = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "FEE_ELECTRIC_TIER", joinColumns = @JoinColumn(name = "BUILDING_ID"))
    @OrderColumn(name = "TIER_NO")
    @BatchSize(size = 20)
    private List<Tier> electricTiers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "FEE_WATER_TIER", joinColumns = @JoinColumn(name = "BUILDING_ID"))
    @OrderColumn(name = "TIER_NO")
    @BatchSize(size = 20)
    private List<Tier> waterTiers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "FEE_PARKING_RATE", joinColumns = @JoinColumn(name = "BUILDING_ID"))
    @BatchSize(size = 20)
    private List<ParkingRate> parkingRates = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "FEE_OTHER_CHARGE", joinColumns = @JoinColumn(name = "BUILDING_ID"))
    @OrderColumn(name = "LINE_NO")
    @BatchSize(size = 20)
    private List<OtherCharge> otherCharges = new ArrayList<>();

    /** Phí quản lý đ/m²/tháng theo loại căn. */
    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagementRate {
        @Enumerated(EnumType.STRING)
        @Column(name = "APARTMENT_TYPE", nullable = false, length = 30)
        private ApartmentType apartmentType;

        @Column(name = "UNIT_PRICE", nullable = false)
        private BigDecimal unitPrice;
    }

    /** Bậc thang: tiêu thụ cộng dồn tới {@code upTo} (null = phần còn lại) tính theo {@code unitPrice}. */
    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Tier {
        @Column(name = "UP_TO")
        private BigDecimal upTo;

        @Column(name = "UNIT_PRICE", nullable = false)
        private BigDecimal unitPrice;
    }

    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParkingRate {
        @Column(name = "ASSET_CATEGORY_ID", nullable = false)
        private Long assetCategoryId;

        @Column(name = "UNIT_PRICE", nullable = false)
        private BigDecimal unitPrice;
    }

    @Getter
    @Setter
    @Embeddable
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OtherCharge {
        @Column(name = "NAME", nullable = false, length = 100)
        private String name;

        @Column(name = "AMOUNT", nullable = false)
        private BigDecimal amount;
    }
}
