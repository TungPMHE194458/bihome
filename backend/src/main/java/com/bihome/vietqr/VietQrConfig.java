package com.bihome.vietqr;

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

/** Tài khoản nhận tiền VietQR của một tòa (khoá chính = BUILDING_ID). */
@Getter
@Setter
@AuditTrail(module = "VIETQR", type = "VIETQR_CONFIG", label = "accountNo", building = true)
@Entity
@Table(name = "VIETQR_CONFIG")
public class VietQrConfig extends AuditableEntity {

    public static final String CODE_PLACEHOLDER = "{MA_THONG_BAO}";
    public static final String DEFAULT_TEMPLATE = "BIHOME " + CODE_PLACEHOLDER;

    @Id
    @Column(name = "BUILDING_ID")
    private Long buildingId;

    @Column(name = "BANK_BIN", nullable = false, length = 6)
    private String bankBin;

    @Column(name = "ACCOUNT_NO", nullable = false, length = 19)
    private String accountNo;

    @Column(name = "ACCOUNT_NAME", nullable = false, length = 50)
    private String accountName;

    @Column(name = "CONTENT_TEMPLATE", nullable = false, length = 50)
    private String contentTemplate = DEFAULT_TEMPLATE;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "ENABLED", nullable = false)
    private boolean enabled = true;

    /** Nội dung chuyển khoản cho một thông báo phí (đã bỏ dấu, viết hoa). */
    public String transferContent(String noticeCode) {
        return VietQrPayload.sanitize(contentTemplate.replace(CODE_PLACEHOLDER, noticeCode));
    }
}
