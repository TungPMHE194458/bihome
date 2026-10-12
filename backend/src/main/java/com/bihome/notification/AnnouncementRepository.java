package com.bihome.notification;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long>, JpaSpecificationExecutor<Announcement> {

    @Override
    @EntityGraph(attributePaths = "building")
    Page<Announcement> findAll(Specification<Announcement> spec, Pageable pageable);

    @Query("select a.id from Announcement a where a.status = 'SCHEDULED' and a.scheduledAt <= :now order by a.scheduledAt")
    List<Long> findDueIds(@Param("now") OffsetDateTime now);

    /** Nhân viên nhận thông báo: người dùng đang hoạt động được gán làm việc ở tòa. */
    @Query("select u.id from AppUser u where u.status = com.bihome.user.UserStatus.ACTIVE "
            + "and :buildingId member of u.buildingIds")
    List<Long> findStaffIds(@Param("buildingId") Long buildingId);
}
