package com.bihome.amenity;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.common.entity.HhmmTimeConverter;
import com.bihome.common.storage.EntityImage;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Formula;
import org.hibernate.type.NumericBooleanConverter;

@Getter
@Setter
@AuditTrail(module = "AMENITY", type = "AMENITY", label = {"code", "name"})
@Entity
@Table(name = "AMENITY")
public class Amenity extends BuildingScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 30)
    private String code;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;

    @Column(name = "LOCATION", length = 200)
    private String location;

    @Column(name = "CAPACITY", nullable = false)
    private int capacity;

    @Convert(converter = HhmmTimeConverter.class)
    @Column(name = "OPEN_TIME", nullable = false, length = 5)
    private LocalTime openTime;

    @Convert(converter = HhmmTimeConverter.class)
    @Column(name = "CLOSE_TIME", nullable = false, length = 5)
    private LocalTime closeTime;

    @Column(name = "RULES", length = 4000)
    private String rules;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "REQUIRES_APPROVAL", nullable = false)
    private boolean requiresApproval;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    @ElementCollection
    @CollectionTable(name = "AMENITY_IMAGE", joinColumns = @JoinColumn(name = "AMENITY_ID"))
    @OrderColumn(name = "SORT_ORDER")
    @BatchSize(size = 50)
    private List<EntityImage> images = new ArrayList<>();

    /** Số khung giờ đã cấu hình (0 = chưa mở đặt chỗ). */
    @Formula("(select count(*) from AMENITY_SLOT s where s.AMENITY_ID = ID)")
    @Setter(AccessLevel.NONE)
    private long slotCount;

    public Optional<Long> coverFileId() {
        return images.stream().filter(EntityImage::isCover).map(EntityImage::getFileId).findFirst();
    }
}
