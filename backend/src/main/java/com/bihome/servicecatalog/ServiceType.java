package com.bihome.servicecatalog;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Formula;

/** Loại dịch vụ dùng chung cho mọi tòa. */
@Getter
@Setter
@AuditTrail(module = "SERVICE", type = "SERVICE_TYPE", label = "name")
@Entity
@Table(name = "SERVICE_TYPE")
public class ServiceType extends BaseEntity {

    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    @Column(name = "DESCRIPTION", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    /** Số dịch vụ (mọi tòa) thuộc loại; dùng được trong sắp xếp ("serviceCount"). */
    @Formula("(select count(*) from SERVICE s where s.SERVICE_TYPE_ID = ID)")
    @Setter(AccessLevel.NONE)
    private long serviceCount;
}
