package com.bihome.voucher;

import com.bihome.transaction.FinancialTransaction.SourceType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoucherUsageRepository extends JpaRepository<VoucherUsage, Long> {

    long countByVoucherIdAndApartmentId(Long voucherId, Long apartmentId);

    Optional<VoucherUsage> findBySourceTypeAndSourceId(SourceType sourceType, Long sourceId);

    long countByApartmentId(Long apartmentId);
}
