package com.bihome.setting;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.type.NumericBooleanConverter;

/** Cấu hình chung (một dòng duy nhất, ID = 1). */
@Getter
@Setter
@AuditTrail(module = "SETTING", type = "SYSTEM_SETTING", label = "companyName")
@Entity
@Table(name = "SYSTEM_SETTING")
public class SystemSetting extends AuditableEntity {

    public static final long SINGLETON_ID = 1;

    @Id
    @Column(name = "ID")
    private Long id = SINGLETON_ID;

    @Column(name = "COMPANY_NAME", length = 200)
    private String companyName;

    @Column(name = "TAX_CODE", length = 20)
    private String taxCode;

    @Column(name = "ADDRESS", length = 300)
    private String address;

    @Column(name = "HOTLINE", length = 20)
    private String hotline;

    @Column(name = "EMAIL", length = 150)
    private String email;

    @Column(name = "WEBSITE", length = 150)
    private String website;

    @Column(name = "DOCUMENT_FOOTER", length = 300)
    private String documentFooter;

    @Column(name = "MAX_FAILED_LOGINS", nullable = false)
    private int maxFailedLogins = 5;

    @Column(name = "LOCK_MINUTES", nullable = false)
    private int lockMinutes = 15;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "FEE_NOTICE_EMAIL", nullable = false)
    private boolean feeNoticeEmail = true;
}
