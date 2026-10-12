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

@Getter
@Setter
@Entity
@Table(name = "LOGIN_HISTORY")
public class LoginHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null khi tên đăng nhập không tồn tại. */
    @Column(name = "USER_ID")
    private Long userId;

    @Column(name = "LOGIN_NAME", nullable = false, length = 150)
    private String loginName;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "SUCCESS", nullable = false)
    private boolean success;

    @Column(name = "FAILURE_REASON", length = 50)
    private String failureReason;

    @Column(name = "IP_ADDRESS", length = 45)
    private String ipAddress;

    @Column(name = "USER_AGENT", length = 500)
    private String userAgent;

    @Column(name = "CREATED_AT", nullable = false)
    private OffsetDateTime createdAt;
}
