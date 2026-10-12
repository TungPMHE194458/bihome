package com.bihome.transaction;

import com.bihome.transaction.FinancialTransaction.SourceType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancialTransactionRepository
        extends JpaRepository<FinancialTransaction, Long>, JpaSpecificationExecutor<FinancialTransaction> {

    @Override
    @EntityGraph(attributePaths = {"building", "apartment", "resident"})
    Page<FinancialTransaction> findAll(Specification<FinancialTransaction> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "apartment", "resident"})
    List<FinancialTransaction> findAll(Specification<FinancialTransaction> spec, Sort sort);

    Optional<FinancialTransaction> findBySourceTypeAndSourceId(SourceType sourceType, Long sourceId);

    List<FinancialTransaction> findBySourceTypeAndSourceIdIn(SourceType sourceType, Collection<Long> sourceIds);

    long countByApartmentId(Long apartmentId);

    /** Khoản chưa thanh toán, chưa đưa vào thông báo phí nào — cộng vào thông báo phí kỳ tới. */
    @Query("select t from FinancialTransaction t where t.apartmentId in :apartmentIds and t.status = "
            + "com.bihome.transaction.FinancialTransaction.Status.PENDING and t.feeNoticeId is null order by t.createdAt")
    List<FinancialTransaction> findUnbilled(@Param("apartmentIds") Collection<Long> apartmentIds);

    List<FinancialTransaction> findByFeeNoticeId(Long feeNoticeId);

    long countByResidentId(Long residentId);
}
