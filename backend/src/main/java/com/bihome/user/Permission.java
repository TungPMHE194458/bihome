package com.bihome.user;

import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Quyền dạng {MODULE}_{READ|WRITE|DELETE|EXPORT}, seed sẵn trong migration. */
@Getter
@Setter
@Entity
@Table(name = "PERMISSION")
public class Permission extends BaseEntity {

    @Column(name = "CODE", nullable = false, length = 60, updatable = false)
    private String code;

    @Column(name = "MODULE_CODE", nullable = false, length = 30)
    private String moduleCode;

    @Column(name = "ACTION_CODE", nullable = false, length = 10)
    private String actionCode;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;
}
