package com.bihome.user;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.type.NumericBooleanConverter;

/** SUPER_ADMIN không cần dòng ROLE_PERMISSION: được cấp mọi quyền khi nạp AuthUser. */
@Getter
@Setter
@AuditTrail(module = "ROLE", type = "ROLE", label = {"code", "name"})
@Entity
@Table(name = "ROLE")
public class Role extends BaseEntity {

    @Column(name = "CODE", nullable = false, length = 30, updatable = false)
    private String code;

    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    @Column(name = "DESCRIPTION", length = 500)
    private String description;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "IS_SYSTEM", nullable = false)
    private boolean system;

    @ManyToMany
    @JoinTable(name = "ROLE_PERMISSION",
            joinColumns = @JoinColumn(name = "ROLE_ID"),
            inverseJoinColumns = @JoinColumn(name = "PERMISSION_ID"))
    @BatchSize(size = 50)
    private Set<Permission> permissions = new HashSet<>();
}
