package com.bihome.user;

import com.bihome.common.web.SpecificationBuilder;
import com.bihome.user.dto.UserRequests;
import jakarta.persistence.criteria.Join;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

final class UserSpecifications {

    private UserSpecifications() {
    }

    static Specification<AppUser> of(UserRequests.Filter f) {
        return SpecificationBuilder.<AppUser>create()
                .likeAny(f.keyword(), "username", "email", "phone", "profile.fullName")
                .like("username", f.username())
                .like("profile.fullName", f.fullName())
                .like("email", f.email())
                .eq("status", f.status())
                .and(hasRole(f.role()))
                .build();
    }

    private static Specification<AppUser> hasRole(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return null;
        }
        String code = roleCode.trim().toUpperCase(Locale.ROOT);
        return (root, query, cb) -> {
            query.distinct(true);
            Join<AppUser, Role> roles = root.join("roles");
            return cb.equal(roles.get("code"), code);
        };
    }
}
