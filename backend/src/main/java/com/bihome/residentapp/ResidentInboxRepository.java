package com.bihome.residentapp;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResidentInboxRepository extends JpaRepository<ResidentInboxItem, Long> {

    Page<ResidentInboxItem> findByResidentIdOrderByCreatedAtDescIdDesc(Long residentId, Pageable pageable);

    Page<ResidentInboxItem> findByResidentIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(Long residentId, Pageable pageable);

    long countByResidentIdAndReadAtIsNull(Long residentId);

    Optional<ResidentInboxItem> findByIdAndResidentId(Long id, Long residentId);

    @Modifying
    @Query("update ResidentInboxItem i set i.readAt = :at where i.residentId = :residentId and i.readAt is null")
    int markAllRead(@Param("residentId") Long residentId, @Param("at") OffsetDateTime at);
}
