package com.bihome.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity thuộc một tòa nhà. Giữ {@code buildingId} thay vì quan hệ tới entity Building
 * vì module Tòa nhà chưa tồn tại; có thể đổi sang {@code @ManyToOne(LAZY)} khi thêm module đó.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class BuildingScopedEntity extends BaseEntity {

    @Column(name = "BUILDING_ID", nullable = false, updatable = false)
    private Long buildingId;
}
