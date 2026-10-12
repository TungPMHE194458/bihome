package com.bihome.feenotice;

import com.bihome.feenotice.FeeNotice.Status;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
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
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeeNoticeRepository extends JpaRepository<FeeNotice, Long>, JpaSpecificationExecutor<FeeNotice> {

    @Override
    @EntityGraph(attributePaths = {"building", "apartment"})
    Page<FeeNotice> findAll(Specification<FeeNotice> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "apartment"})
    List<FeeNotice> findAll(Specification<FeeNotice> spec, Sort sort);

    /** Khoá dòng khi ghi nhận / huỷ thanh toán để số đã thu không bị ghi đè khi thu đồng thời. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from FeeNotice n where n.id = :id")
    Optional<FeeNotice> findForUpdate(@Param("id") Long id);

    Optional<FeeNotice> findByCode(String code);

    /** Kỳ của căn bị khoá số liệu khi đã có thông báo phí phát hành (không tính nháp / huỷ). */
    @Query("select count(n) > 0 from FeeNotice n where n.apartmentId = :apartmentId and n.billingPeriod = :period "
            + "and n.status not in (com.bihome.feenotice.FeeNotice.Status.DRAFT, com.bihome.feenotice.FeeNotice.Status.CANCELLED)")
    boolean isLocked(@Param("apartmentId") Long apartmentId, @Param("period") String period);

    @Query("select n.apartmentId from FeeNotice n where n.apartmentId in :apartmentIds and n.billingPeriod = :period "
            + "and n.status not in (com.bihome.feenotice.FeeNotice.Status.DRAFT, com.bihome.feenotice.FeeNotice.Status.CANCELLED)")
    List<Long> findLockedApartments(@Param("apartmentIds") Collection<Long> apartmentIds, @Param("period") String period);

    @Query("select n from FeeNotice n where n.apartmentId in :apartmentIds and n.billingPeriod = :period "
            + "and n.status <> com.bihome.feenotice.FeeNotice.Status.CANCELLED")
    List<FeeNotice> findActiveForPeriod(@Param("apartmentIds") Collection<Long> apartmentIds, @Param("period") String period);

    /** Thông báo các kỳ trước còn nợ, chưa chuyển nợ — thành "Nợ kỳ trước" của kỳ mới. */
    @Query("select n from FeeNotice n where n.apartmentId in :apartmentIds and n.billingPeriod < :period "
            + "and n.status in :statuses and n.carriedToId is null order by n.billingPeriod")
    List<FeeNotice> findUnpaidBefore(@Param("apartmentIds") Collection<Long> apartmentIds, @Param("period") String period,
                                     @Param("statuses") Collection<Status> statuses);

    List<FeeNotice> findByCarriedToId(Long carriedToId);

    List<FeeNotice> findByCodeIn(Collection<String> codes);

    @Query("select n.id from FeeNotice n where n.status in :statuses and n.dueDate < :today and n.carriedToId is null")
    List<Long> findOverdueIds(@Param("statuses") Collection<Status> statuses, @Param("today") LocalDate today);

    @Query("select n.id from FeeNotice n where n.buildingId = :buildingId and n.billingPeriod = :period "
            + "and n.status = com.bihome.feenotice.FeeNotice.Status.DRAFT order by n.code")
    List<Long> findDraftIds(@Param("buildingId") Long buildingId, @Param("period") String period);

    long countByApartmentId(Long apartmentId);
}
