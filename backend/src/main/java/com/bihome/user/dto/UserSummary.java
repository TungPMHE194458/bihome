package com.bihome.user.dto;

import com.bihome.user.UserStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record UserSummary(
        Long id,
        String username,
        String email,
        String phone,
        String fullName,
        String avatarUrl,
        List<RoleSummary> roles,
        List<Long> buildingIds,
        UserStatus status,
        boolean temporarilyLocked,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt) {
}
