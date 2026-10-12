package com.bihome.apartment;

import com.bihome.audit.AuditTrail;
import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.apartment.ApartmentEnums.OwnershipType;
import com.bihome.apartment.ApartmentEnums.UsageStatus;
import com.bihome.building.Building;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.common.storage.EntityImage;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Formula;

@Getter
@Setter
@AuditTrail(module = "APARTMENT", type = "APARTMENT", label = "code")
@Entity
@Table(name = "APARTMENT")
// Nạp proxy theo lô khi duyệt quan hệ tới căn hộ (vd danh sách cư dân → căn đang ở).
@BatchSize(size = 50)
public class Apartment extends BuildingScopedEntity {

    /** Chỉ đọc, để hiển thị tên tòa và lọc/sắp xếp; gán tòa qua {@code buildingId}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 30)
    private String code;

    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    /** Tầng dạng chuỗi để nhận cả "12A", "B1". */
    @Column(name = "FLOOR_NO", nullable = false, length = 10)
    private String floorNo;

    @Column(name = "BEDROOMS")
    private Integer bedrooms;

    @Column(name = "ROOMS")
    private Integer rooms;

    /** Diện tích (m²), dùng tính phí quản lý. */
    @Column(name = "AREA", nullable = false, precision = 10, scale = 2)
    private BigDecimal area;

    @Enumerated(EnumType.STRING)
    @Column(name = "TYPE", nullable = false, length = 30)
    private ApartmentType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "OWNERSHIP_TYPE", nullable = false, length = 30)
    private OwnershipType ownershipType;

    @Enumerated(EnumType.STRING)
    @Column(name = "USAGE_STATUS", nullable = false, length = 30)
    private UsageStatus usageStatus;

    @Column(name = "DESCRIPTION", length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    @ElementCollection
    @CollectionTable(name = "APARTMENT_IMAGE", joinColumns = @JoinColumn(name = "APARTMENT_ID"))
    @OrderColumn(name = "SORT_ORDER")
    @BatchSize(size = 50)
    private List<EntityImage> images = new ArrayList<>();

    /** Số cư dân còn ở (Đang ở + Tạm vắng); dùng được trong sắp xếp ("memberCount"). */
    @Formula("(select count(*) from APARTMENT_RESIDENT ar where ar.APARTMENT_ID = ID "
            + "and ar.RESIDENCE_STATUS <> 'MOVED_OUT')")
    @Setter(AccessLevel.NONE)
    private long memberCount;

    public Optional<Long> coverFileId() {
        return images.stream().filter(EntityImage::isCover).map(EntityImage::getFileId).findFirst();
    }
}
