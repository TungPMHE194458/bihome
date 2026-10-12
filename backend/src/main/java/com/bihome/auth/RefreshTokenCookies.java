package com.bihome.auth;

import com.bihome.common.security.JwtProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

/** Refresh token nằm trong cookie HttpOnly, chỉ gửi kèm các request tới /api/v1/auth. */
@Component
public class RefreshTokenCookies {

    static final String PATH = "/api/v1/auth";

    private final JwtProperties properties;

    public RefreshTokenCookies(JwtProperties properties) {
        this.properties = properties;
    }

    /** Không "Ghi nhớ đăng nhập" → cookie phiên (không có Max-Age), mất khi đóng trình duyệt. */
    public ResponseCookie build(String rawToken, boolean rememberMe) {
        return base(rawToken).maxAge(rememberMe ? properties.refreshTtl() : Duration.ofSeconds(-1)).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    public String read(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, properties.cookieName());
        return cookie == null || cookie.getValue().isBlank() ? null : cookie.getValue();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(properties.cookieName(), value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Lax")
                .path(PATH);
    }
}
