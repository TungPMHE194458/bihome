package com.bihome.common.security;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static Optional<AuthUser> find() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser user ? Optional.of(user) : Optional.empty();
    }

    public static AuthUser get() {
        return find().orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }
}
