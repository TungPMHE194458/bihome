package com.bihome.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-key-at-least-32-bytes!!";
    private static final Instant NOW = Instant.parse("2026-10-10T01:00:00Z");

    private static JwtService service(String secret, Instant now) {
        JwtProperties props = new JwtProperties(secret, Duration.ofMinutes(15), Duration.ofDays(7),
                Duration.ofDays(1), "bihome_refresh", false);
        return new JwtService(props, Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void createdTokenParsesBackToSameClaims() {
        JwtService jwt = service(SECRET, NOW);

        AccessTokenClaims claims = jwt.parseAccessToken(jwt.createAccessToken(42L, "an.nguyen")).orElseThrow();

        assertThat(claims.userId()).isEqualTo(42L);
        assertThat(claims.username()).isEqualTo("an.nguyen");
        assertThat(claims.issuedAt()).isEqualTo(NOW);
        assertThat(jwt.accessTtlSeconds()).isEqualTo(900);
    }

    @Test
    void expiredTokenIsRejected() {
        String token = service(SECRET, NOW).createAccessToken(1L, "a");

        assertThat(service(SECRET, NOW.plus(Duration.ofMinutes(14))).parseAccessToken(token)).isPresent();
        assertThat(service(SECRET, NOW.plus(Duration.ofMinutes(16))).parseAccessToken(token)).isEmpty();
    }

    @Test
    void tamperedOrForeignTokensAreRejected() {
        String token = service(SECRET, NOW).createAccessToken(1L, "a");
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("AA") ? "BB" : "AA");

        assertThat(service(SECRET, NOW).parseAccessToken(tampered)).isEmpty();
        assertThat(service("another-secret-key-also-32-bytes-long!!", NOW).parseAccessToken(token)).isEmpty();
        assertThat(service(SECRET, NOW).parseAccessToken("garbage")).isEmpty();
    }

    @Test
    void shortSecretIsRefusedAtStartup() {
        assertThatThrownBy(() -> new JwtProperties("short", Duration.ofMinutes(15), Duration.ofDays(7),
                Duration.ofDays(1), "c", true)).isInstanceOf(IllegalStateException.class);
    }
}
