package com.bihome.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.type.NumericBooleanConverter;

/**
 * Chỉ lưu SHA-256 của token. Mỗi lần refresh tạo token mới cùng {@code familyId}; token cũ bị đánh dấu ROTATED.
 * Dùng lại token đã ROTATED nghĩa là token bị lộ → thu hồi cả family.
 */
@Getter
@Setter
@Entity
@Table(name = "REFRESH_TOKEN")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "TOKEN_HASH", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "FAMILY_ID", nullable = false, length = 36)
    private String familyId;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "REMEMBER_ME", nullable = false)
    private boolean rememberMe;

    @Column(name = "EXPIRES_AT", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "REVOKED_AT")
    private OffsetDateTime revokedAt;

    @Column(name = "REVOKE_REASON", length = 30)
    private String revokeReason;

    @Column(name = "IP_ADDRESS", length = 45)
    private String ipAddress;

    @Column(name = "USER_AGENT", length = 500)
    private String userAgent;

    @Column(name = "CREATED_AT", nullable = false)
    private OffsetDateTime createdAt;
}
