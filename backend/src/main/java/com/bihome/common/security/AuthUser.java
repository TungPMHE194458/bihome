package com.bihome.common.security;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.security.core.AuthenticatedPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Người dùng đã xác thực, nạp lại từ DB ở mỗi request để khoá/đổi quyền có hiệu lực ngay. */
public record AuthUser(
        Long id,
        String username,
        Set<String> roles,
        Set<String> permissions,
        Set<Long> buildingIds,
        boolean superAdmin,
        boolean mustChangePassword) implements AuthenticatedPrincipal {

    public static final String SUPER_ADMIN = "SUPER_ADMIN";

    @Override
    public String getName() {
        return username;
    }

    public List<GrantedAuthority> authorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        permissions.forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
        roles.forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
        return authorities;
    }

    public boolean canAccessBuilding(Long buildingId) {
        return superAdmin || buildingIds.contains(buildingId);
    }
}
