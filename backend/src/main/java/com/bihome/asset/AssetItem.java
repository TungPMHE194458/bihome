package com.bihome.asset;

import com.bihome.audit.AuditTrail;
import com.bihome.apartment.Apartment;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BuildingScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Formula;

/**
 * Hạng mục kê khai của căn hộ (chủ yếu là xe). Tòa nhà = tòa của căn hộ.
 * Số lượng xe đang hoạt động dùng tính phí gửi xe ở Thông báo phí.
 */
@Getter
@Setter
@AuditTrail(module = "ASSET", type = "ASSET_ITEM", label = {"name", "plateNumber"})
@Entity
@Table(name = "ASSET_ITEM")
public class AssetItem extends BuildingScopedEntity {

    @Column(name = "APARTMENT_ID", nullable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "CATEGORY_ID", nullable = false)
    private Long categoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CATEGORY_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private AssetCategory category;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;

    /** Biển số / số hiệu đã chuẩn hoá; duy nhất trong tòa trong số hạng mục đang hoạt động. */
    @Column(name = "PLATE_NUMBER", length = 30)
    private String plateNumber;

    @Column(name = "DESCRIPTION", length = 1000)
    private String description;

    @Column(name = "UNIT", nullable = false, length = 30)
    private String unit;

    @Column(name = "ENTRY_DATE", nullable = false)
    private LocalDate entryDate;

    @Column(name = "EXIT_DATE")
    private LocalDate exitDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    /** Mã thẻ từ đang dùng / khoá liên kết với xe; dùng được để lọc và sắp xếp ("accessCardNo"). */
    @Formula("(select max(c.CARD_NO) from ACCESS_CARD c where c.ASSET_ITEM_ID = ID and c.STATUS in ('IN_USE', 'LOCKED'))")
    @Setter(AccessLevel.NONE)
    private String accessCardNo;
}
