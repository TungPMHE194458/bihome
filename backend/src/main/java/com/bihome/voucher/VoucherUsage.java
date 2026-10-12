package com.bihome.voucher;

import com.bihome.transaction.FinancialTransaction.SourceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Một lượt dùng voucher của căn hộ cho một đăng ký tiện ích / đơn dịch vụ. */
@Getter
@Setter
@Entity
@Table(name = "VOUCHER_USAGE")
public class VoucherUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "VOUCHER_ID", nullable = false, updatable = false)
    private Long voucherId;

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "SOURCE_TYPE", nullable = false, updatable = false, length = 20)
    private SourceType sourceType;

    @Column(name = "SOURCE_ID", nullable = false, updatable = false)
    private Long sourceId;

    @Column(name = "DISCOUNT", nullable = false)
    private BigDecimal discount;

    @Column(name = "USED_AT", nullable = false, updatable = false)
    private OffsetDateTime usedAt;
}
