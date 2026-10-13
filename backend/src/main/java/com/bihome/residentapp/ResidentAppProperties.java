package com.bihome.residentapp;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param refreshTtl    hạn refresh token của app (đăng nhập một lần, dùng lâu dài trên điện thoại)
 * @param minVersion    phiên bản app tối thiểu; app cũ hơn bị buộc cập nhật (GET /resident/app-config)
 * @param pushEnabled   gửi push qua Expo Push Service; tắt thì chỉ ghi log (local / test)
 * @param expoAccessToken token Expo (tuỳ chọn, khi bật "Enhanced push security")
 */
@ConfigurationProperties(prefix = "bihome.resident-app")
public record ResidentAppProperties(
        @DefaultValue("90d") Duration refreshTtl,
        @DefaultValue("1.0.0") String minVersion,
        @DefaultValue("false") boolean pushEnabled,
        String expoAccessToken) {
}
