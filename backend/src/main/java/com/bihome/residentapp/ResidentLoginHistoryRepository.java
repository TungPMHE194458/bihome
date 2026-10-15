package com.bihome.residentapp;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResidentLoginHistoryRepository extends JpaRepository<ResidentLoginHistory, Long> {

    Page<ResidentLoginHistory> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);
}
