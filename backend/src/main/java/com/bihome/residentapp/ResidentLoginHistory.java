package com.bihome.residentapp;

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

/** Lịch sử đăng nhập app cư dân (thành công và thất bại); không ghi qua {@code @AuditTrail}. */
@Getter
@Setter
@Entity
@Table(name = "RESIDENT_LOGIN_HISTORY")
public class ResidentLoginHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null khi số điện thoại không có tài khoản, hoặc tài khoản đã bị xoá sau đó. */
    @Column(name = "ACCOUNT_ID")
    private Long accountId;

    @Column(name = "PHONE", nullable = false, length = 20)
    private String phone;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "SUCCESS", nullable = false)
    private boolean success;

    @Column(name = "FAILURE_REASON", length = 50)
    private String failureReason;

    @Column(name = "IP_ADDRESS", length = 45)
    private String ipAddress;

    @Column(name = "USER_AGENT", length = 500)
    private String userAgent;

    @Column(name = "DEVICE_NAME", length = 150)
    private String deviceName;

    @Column(name = "CREATED_AT", nullable = false)
    private OffsetDateTime createdAt;
}
