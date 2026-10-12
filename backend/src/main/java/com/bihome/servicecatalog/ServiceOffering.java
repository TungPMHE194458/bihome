package com.bihome.servicecatalog;

import com.bihome.audit.AuditTrail;
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

/** Dịch vụ của tòa nhà (bảng SERVICE; tên lớp tránh trùng annotation @Service của Spring). */
@Getter
@Setter
@AuditTrail(module = "SERVICE", type = "SERVICE", label = {"code", "name"})
@Entity
@Table(name = "SERVICE")
public class ServiceOffering extends BuildingScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 30)
    private String code;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;

    @Column(name = "SERVICE_TYPE_ID", nullable = false)
    private Long serviceTypeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SERVICE_TYPE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private ServiceType serviceType;

    @Column(name = "UNIT_PRICE", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "UNIT", nullable = false, length = 30)
    private String unit;

    @Column(name = "DESCRIPTION", length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    @ElementCollection
    @CollectionTable(name = "SERVICE_IMAGE", joinColumns = @JoinColumn(name = "SERVICE_ID"))
    @OrderColumn(name = "SORT_ORDER")
    @BatchSize(size = 50)
    private List<EntityImage> images = new ArrayList<>();

    public Optional<Long> coverFileId() {
        return images.stream().filter(EntityImage::isCover).map(EntityImage::getFileId).findFirst();
    }
}
