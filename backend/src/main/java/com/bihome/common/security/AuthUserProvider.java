package com.bihome.common.security;

import java.time.Instant;
import java.util.Optional;

public interface AuthUserProvider {

    /** Rỗng nếu user không còn hoạt động hoặc token được cấp trước lần đổi mật khẩu gần nhất. */
    Optional<AuthUser> loadActive(Long userId, Instant tokenIssuedAt);
}
