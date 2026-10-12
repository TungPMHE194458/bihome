package com.bihome.payment;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    @Override
    @EntityGraph(attributePaths = {"building", "apartment", "feeNotice"})
    Page<Payment> findAll(Specification<Payment> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "apartment", "feeNotice"})
    List<Payment> findAll(Specification<Payment> spec, Sort sort);

    List<Payment> findByFeeNoticeIdOrderByPaidAtAscIdAsc(Long feeNoticeId);

    long countByFeeNoticeIdAndStatus(Long feeNoticeId, Payment.Status status);

    long countByApartmentId(Long apartmentId);
}
