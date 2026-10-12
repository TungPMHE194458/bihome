package com.bihome.user.dto;

import com.bihome.user.UserStatus;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * @param buildingIds  tòa nhà được gán; rỗng khi {@code allBuildings} = true (Admin hệ thống xem mọi tòa)
 */
public record MeResponse(
        Long id,
        String username,
        String email,
        String phone,
        UserStatus status,
        boolean mustChangePassword,
        OffsetDateTime lastLoginAt,
        ProfileResponse profile,
        List<RoleSummary> roles,
        List<String> permissions,
        List<Long> buildingIds,
        boolean allBuildings) {
}
