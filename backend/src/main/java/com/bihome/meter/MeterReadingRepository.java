package com.bihome.meter;

import com.bihome.meter.MeterReading.MeterType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MeterReadingRepository extends JpaRepository<MeterReading, Long>, JpaSpecificationExecutor<MeterReading> {

    @Override
    @EntityGraph(attributePaths = {"building", "apartment"})
    Page<MeterReading> findAll(Specification<MeterReading> spec, Pageable pageable);

    /** Toàn bộ chuỗi số liệu của một đồng hồ, theo kỳ tăng dần. */
    @Query("select m from MeterReading m where m.apartmentId = :apartmentId and m.meterType = :type order by m.billingPeriod")
    List<MeterReading> findChain(@Param("apartmentId") Long apartmentId, @Param("type") MeterType type);

    Optional<MeterReading> findByApartmentIdAndMeterTypeAndBillingPeriod(Long apartmentId, MeterType type, String period);

    @Query("select m from MeterReading m where m.apartmentId in :apartmentIds and m.billingPeriod = :period")
    List<MeterReading> findForPeriod(@Param("apartmentIds") Collection<Long> apartmentIds, @Param("period") String period);

    /** Số liệu gần nhất trước kỳ (của từng căn) — lấy chỉ số cũ cho lưới nhập nhanh. */
    @Query("select m from MeterReading m where m.apartmentId in :apartmentIds and m.meterType = :type "
            + "and m.billingPeriod = (select max(p.billingPeriod) from MeterReading p where p.apartmentId = m.apartmentId "
            + "and p.meterType = m.meterType and p.billingPeriod < :period)")
    List<MeterReading> findLatestBefore(@Param("apartmentIds") Collection<Long> apartmentIds,
                                        @Param("type") MeterType type, @Param("period") String period);

    /** Kỳ đầu của từng đồng hồ: [apartmentId, meterType, min(kỳ)] — một câu cho cả trang danh sách. */
    @Query("select m.apartmentId, m.meterType, min(m.billingPeriod) from MeterReading m where m.apartmentId in :apartmentIds "
            + "group by m.apartmentId, m.meterType")
    List<Object[]> findFirstPeriods(@Param("apartmentIds") Collection<Long> apartmentIds);

    long countByApartmentId(Long apartmentId);
}
