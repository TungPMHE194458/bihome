package com.bihome.user;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.BaseEntity;
import com.bihome.common.security.AuthUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.type.NumericBooleanConverter;

@Getter
@Setter
@AuditTrail(module = "USER", type = "USER", label = "username",
        ignore = {"lastLoginAt", "failedLoginCount", "lockedUntil"})
@Entity
@Table(name = "APP_USER")
public class AppUser extends BaseEntity {

    @Column(name = "USERNAME", nullable = false, length = 50, updatable = false)
    private String username;

    @Column(name = "EMAIL", nullable = false, length = 150)
    private String email;

    @Column(name = "PHONE", length = 20)
    private String phone;

    @Column(name = "PASSWORD_HASH", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private UserStatus status;

    @Column(name = "FAILED_LOGIN_COUNT", nullable = false)
    private int failedLoginCount;

    /** Khoá tạm sau nhiều lần đăng nhập sai; khác với STATUS = LOCKED do admin khoá. */
    @Column(name = "LOCKED_UNTIL")
    private OffsetDateTime lockedUntil;

    @Column(name = "LAST_LOGIN_AT")
    private OffsetDateTime lastLoginAt;

    @Column(name = "PASSWORD_CHANGED_AT")
    private OffsetDateTime passwordChangedAt;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "MUST_CHANGE_PASSWORD", nullable = false)
    private boolean mustChangePassword;

    @ManyToMany
    @JoinTable(name = "USER_ROLE",
            joinColumns = @JoinColumn(name = "USER_ID"),
            inverseJoinColumns = @JoinColumn(name = "ROLE_ID"))
    @BatchSize(size = 50)
    private Set<Role> roles = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "USER_BUILDING", joinColumns = @JoinColumn(name = "USER_ID"))
    @Column(name = "BUILDING_ID", nullable = false)
    @BatchSize(size = 50)
    private Set<Long> buildingIds = new HashSet<>();

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = false)
    private UserProfile profile;

    public void attachProfile(UserProfile profile) {
        profile.setUser(this);
        this.profile = profile;
    }

    public boolean isSuperAdmin() {
        return roles.stream().anyMatch(r -> AuthUser.SUPER_ADMIN.equals(r.getCode()));
    }

    public boolean isTemporarilyLocked(OffsetDateTime now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }
}
