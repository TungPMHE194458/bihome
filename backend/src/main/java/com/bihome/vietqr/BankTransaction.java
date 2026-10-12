package com.bihome.vietqr;

import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.type.NumericBooleanConverter;

/**
 * Biến động số dư nhận qua webhook ngân hàng (mỗi mã tham chiếu một lần). Khớp được thông báo phí thì có phiếu thu
 * đi kèm. Không audit riêng: phiếu thu sinh ra đã có lịch sử.
 */
@Getter
@Setter
@Entity
@Table(name = "BANK_TRANSACTION")
public class BankTransaction extends BaseEntity {

    public enum MatchStatus { MATCHED, MISMATCHED, UNMATCHED }

    @Column(name = "BUILDING_ID")
    private Long buildingId;

    @Column(name = "BANK_REFERENCE", nullable = false, length = 100, updatable = false)
    private String bankReference;

    @Column(name = "ACCOUNT_NO", length = 19)
    private String accountNo;

    @Column(name = "AMOUNT", nullable = false)
    private BigDecimal amount;

    @Column(name = "CONTENT", length = 500)
    private String content;

    @Column(name = "TRANSACTED_AT", nullable = false)
    private OffsetDateTime transactedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "MATCH_STATUS", nullable = false, length = 20)
    private MatchStatus matchStatus;

    @Column(name = "MATCH_NOTE", length = 300)
    private String matchNote;

    @Column(name = "FEE_NOTICE_ID")
    private Long feeNoticeId;

    @Column(name = "PAYMENT_ID")
    private Long paymentId;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "SIMULATED", nullable = false)
    private boolean simulated;
}
