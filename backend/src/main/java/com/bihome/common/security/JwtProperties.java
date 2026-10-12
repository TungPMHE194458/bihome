package com.bihome.common.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param refreshTtl        hạn refresh token khi chọn "Ghi nhớ đăng nhập" (cookie lưu lâu dài)
 * @param sessionRefreshTtl hạn refresh token khi không ghi nhớ (cookie theo phiên trình duyệt)
 */
@ConfigurationProperties(prefix = "bihome.jwt")
public record JwtProperties(
        String secret,
        @DefaultValue("15m") Duration accessTtl,
        @DefaultValue("7d") Duration refreshTtl,
        @DefaultValue("1d") Duration sessionRefreshTtl,
        @DefaultValue("bihome_refresh") String cookieName,
        @DefaultValue("true") boolean cookieSecure) {

    public JwtProperties {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("bihome.jwt.secret phải dài tối thiểu 32 byte (đặt qua biến môi trường BIHOME_JWT_SECRET).");
        }
    }
}
