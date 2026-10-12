package com.bihome.user;

import com.bihome.common.security.AuthUser;
import com.bihome.common.security.AuthUserProvider;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthUserLoader implements AuthUserProvider {

    private final AppUserRepository users;
    private final PermissionRepository permissions;

    @Override
    public Optional<AuthUser> loadActive(Long userId, Instant tokenIssuedAt) {
        return users.findWithAccessById(userId)
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .filter(u -> issuedAfterPasswordChange(u, tokenIssuedAt))
                .map(this::toAuthUser);
    }

    private static boolean issuedAfterPasswordChange(AppUser user, Instant issuedAt) {
        // iat của JWT tính theo giây nên so sánh ở độ chính xác giây.
        return user.getPasswordChangedAt() == null
                || !issuedAt.isBefore(user.getPasswordChangedAt().toInstant().truncatedTo(ChronoUnit.SECONDS));
    }

    private AuthUser toAuthUser(AppUser user) {
        Set<String> roleCodes = user.getRoles().stream().map(Role::getCode).collect(Collectors.toSet());
        boolean superAdmin = roleCodes.contains(AuthUser.SUPER_ADMIN);
        List<Long> roleIds = user.getRoles().stream().map(Role::getId).toList();
        List<String> codes = superAdmin ? permissions.findAllCodes()
                : roleIds.isEmpty() ? List.of() : permissions.findCodesByRoleIds(roleIds);
        return new AuthUser(user.getId(), user.getUsername(), Set.copyOf(roleCodes), new HashSet<>(codes),
                Set.copyOf(user.getBuildingIds()), superAdmin, user.isMustChangePassword());
    }
}
