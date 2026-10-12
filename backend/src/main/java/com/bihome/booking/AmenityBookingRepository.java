package com.bihome.booking;

import com.bihome.booking.AmenityBooking.Status;
import java.time.LocalDate;
import java.time.LocalTime;
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

public interface AmenityBookingRepository extends JpaRepository<AmenityBooking, Long>, JpaSpecificationExecutor<AmenityBooking> {

    @Override
    @EntityGraph(attributePaths = {"building", "amenity", "apartment", "resident", "voucher"})
    Page<AmenityBooking> findAll(Specification<AmenityBooking> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "amenity", "apartment", "resident", "voucher"})
    Optional<AmenityBooking> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"amenity", "apartment"})
    List<AmenityBooking> findAll(Specification<AmenityBooking> spec);

    /** Số người đã giữ chỗ trong khoảng giờ giao với [start, end) của ngày. */
    @Query("select coalesce(sum(b.peopleCount), 0) from AmenityBooking b where b.amenityId = :amenityId "
            + "and b.bookingDate = :date and b.startTime < :end and b.endTime > :start and b.status in :statuses")
    long sumPeople(@Param("amenityId") Long amenityId, @Param("date") LocalDate date, @Param("start") LocalTime start,
                   @Param("end") LocalTime end, @Param("statuses") Collection<Status> statuses);

    /** Lượt của căn hộ cho tiện ích trong khoảng ngày (một tuần). */
    @Query("select count(b) from AmenityBooking b where b.amenityId = :amenityId and b.apartmentId = :apartmentId "
            + "and b.bookingDate between :from and :to and b.status in :statuses")
    long countForApartment(@Param("amenityId") Long amenityId, @Param("apartmentId") Long apartmentId,
                           @Param("from") LocalDate from, @Param("to") LocalDate to,
                           @Param("statuses") Collection<Status> statuses);

    @EntityGraph(attributePaths = {"apartment"})
    @Query("select b from AmenityBooking b where b.amenityId = :amenityId and b.bookingDate between :from and :to "
            + "and b.status in :statuses order by b.bookingDate, b.startTime, b.id")
    List<AmenityBooking> findInRange(@Param("amenityId") Long amenityId, @Param("from") LocalDate from,
                                     @Param("to") LocalDate to, @Param("statuses") Collection<Status> statuses);

    /** Đã duyệt và đã hết giờ (ngày trước hôm nay, hoặc hôm nay đã qua giờ kết thúc) → hoàn thành. */
    @Query("select b.id from AmenityBooking b where b.status = 'APPROVED' "
            + "and (b.bookingDate < :today or (b.bookingDate = :today and b.endTime <= :now))")
    List<Long> findFinishedIds(@Param("today") LocalDate today, @Param("now") LocalTime now);

    List<AmenityBooking> findByIdIn(Collection<Long> ids, Sort sort);

    long countByAmenityId(Long amenityId);

    long countByApartmentId(Long apartmentId);

    long countByResidentId(Long residentId);

    long countByVoucherId(Long voucherId);
}
