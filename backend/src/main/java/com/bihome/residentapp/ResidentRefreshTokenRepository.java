package com.bihome.residentapp;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResidentRefreshTokenRepository extends JpaRepository<ResidentRefreshToken, Long> {

    Optional<ResidentRefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update ResidentRefreshToken t set t.revokedAt = :at where t.accountId = :accountId and t.revokedAt is null")
    int revokeAll(@Param("accountId") Long accountId, @Param("at") OffsetDateTime at);
}
