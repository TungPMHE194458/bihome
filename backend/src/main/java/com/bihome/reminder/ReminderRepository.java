package com.bihome.reminder;

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

public interface ReminderRepository extends JpaRepository<Reminder, Long>, JpaSpecificationExecutor<Reminder> {

    @Override
    @EntityGraph(attributePaths = "building")
    Page<Reminder> findAll(Specification<Reminder> spec, Pageable pageable);

    @Query("select r.id from Reminder r where r.status = 'SCHEDULED' and r.nextRunAt <= :now order by r.nextRunAt")
    List<Long> findDueIds(@Param("now") OffsetDateTime now);
}
