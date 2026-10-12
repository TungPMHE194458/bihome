package com.bihome.user.dto;

import com.bihome.user.UserStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record UserResponse(
        Long id,
        String username,
        String email,
        String phone,
        UserStatus status,
        boolean mustChangePassword,
        OffsetDateTime lockedUntil,
        OffsetDateTime lastLoginAt,
        ProfileResponse profile,
        List<RoleSummary> roles,
        List<Long> buildingIds,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String createdBy,
        String updatedBy,
        Long version) {
}
