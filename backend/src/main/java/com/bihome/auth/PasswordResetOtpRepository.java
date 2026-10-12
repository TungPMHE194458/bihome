package com.bihome.auth;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findFirstByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(Long userId);

    Optional<PasswordResetOtp> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("update PasswordResetOtp o set o.usedAt = :now where o.userId = :userId and o.usedAt is null")
    int invalidateAll(@Param("userId") Long userId, @Param("now") OffsetDateTime now);
}
