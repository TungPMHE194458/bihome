package com.bihome.building;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import com.bihome.common.storage.EntityImage;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Formula;

@Getter
@Setter
@AuditTrail(module = "BUILDING", type = "BUILDING", label = {"code", "name"}, building = true)
@Entity
@Table(name = "BUILDING")
public class Building extends BaseEntity {

    @Column(name = "CODE", nullable = false, length = 30)
    private String code;

    @Column(name = "NAME", nullable = false, length = 200)
    private String name;

    /** Tỉnh / Thành phố (đơn vị hành chính 2 cấp). */
    @Column(name = "PROVINCE", nullable = false, length = 100)
    private String province;

    /** Phường / Xã. */
    @Column(name = "WARD", nullable = false, length = 100)
    private String ward;

    @Column(name = "ADDRESS_DETAIL", nullable = false, length = 255)
    private String addressDetail;

    @Enumerated(EnumType.STRING)
    @Column(name = "TYPE", nullable = false, length = 30)
    private BuildingType type;

    @Column(name = "FLOORS_ABOVE")
    private Integer floorsAbove;

    @Column(name = "FLOORS_BELOW")
    private Integer floorsBelow;

    @Column(name = "INVESTOR", length = 200)
    private String investor;

    @Column(name = "HOTLINE", length = 20)
    private String hotline;

    @Column(name = "MANAGEMENT_EMAIL", length = 150)
    private String managementEmail;

    @Column(name = "DESCRIPTION", length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    /**
     * Thứ tự ảnh lưu ở SORT_ORDER. Khi cập nhật luôn gán danh sách mới (không sửa tại chỗ) để Hibernate
     * xoá rồi chèn lại, tránh vi phạm khoá chính tạm thời khi đổi chỗ ảnh.
     */
    @ElementCollection
    @CollectionTable(name = "BUILDING_IMAGE", joinColumns = @JoinColumn(name = "BUILDING_ID"))
    @OrderColumn(name = "SORT_ORDER")
    @BatchSize(size = 50)
    private List<EntityImage> images = new ArrayList<>();

    /** Tính bằng subquery mỗi lần nạp tòa nhà; dùng được trong sắp xếp ("apartmentCount"). */
    @Formula("(select count(*) from APARTMENT a where a.BUILDING_ID = ID)")
    @Setter(AccessLevel.NONE)
    private long apartmentCount;

    public Optional<Long> coverFileId() {
        return images.stream().filter(EntityImage::isCover).map(EntityImage::getFileId).findFirst();
    }

    /** "Địa chỉ chi tiết, Phường/Xã, Tỉnh/Thành phố" trên một dòng. */
    public String fullAddress() {
        return Stream.of(addressDetail, ward, province)
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(", "));
    }
}
