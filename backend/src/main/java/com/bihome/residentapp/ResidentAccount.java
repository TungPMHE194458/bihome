package com.bihome.residentapp;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.type.NumericBooleanConverter;

/** Tài khoản app của một cư dân (BQL cấp); đăng nhập bằng số điện thoại. Xoá tài khoản = xoá dòng. */
@Getter
@Setter
@AuditTrail(module = "RESIDENT", type = "RESIDENT_ACCOUNT", label = "phone",
        ignore = {"failedLoginCount", "lockedUntil", "lastLoginAt", "passwordChangedAt"},
        buildingSql = "SELECT BUILDING_ID FROM RESIDENT WHERE ID = ?", buildingKey = "residentId")
@Entity
@Table(name = "RESIDENT_ACCOUNT")
public class ResidentAccount extends BaseEntity {

    public enum Status { ACTIVE, LOCKED }

    @Column(name = "RESIDENT_ID", nullable = false, updatable = false)
    private Long residentId;

    @Column(name = "PHONE", nullable = false, length = 20)
    private String phone;

    @Column(name = "PASSWORD_HASH", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "MUST_CHANGE_PASSWORD", nullable = false)
    private boolean mustChangePassword = true;

    @Column(name = "FAILED_LOGIN_COUNT", nullable = false)
    private int failedLoginCount;

    @Column(name = "LOCKED_UNTIL")
    private OffsetDateTime lockedUntil;

    @Column(name = "PASSWORD_CHANGED_AT")
    private OffsetDateTime passwordChangedAt;

    @Column(name = "LAST_LOGIN_AT")
    private OffsetDateTime lastLoginAt;

    public boolean isTemporarilyLocked(OffsetDateTime now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }
}
