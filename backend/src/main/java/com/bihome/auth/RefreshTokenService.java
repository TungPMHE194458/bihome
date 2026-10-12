package com.bihome.auth;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.JwtProperties;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Base64;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository repository;
    private final JwtProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository, JwtProperties properties, Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    public record Rotation(Long userId, String rawToken, boolean rememberMe) {
    }

    /** @return token gốc (chỉ trả cho client qua cookie, DB chỉ giữ hash) */
    @Transactional
    public String issue(Long userId, String familyId, boolean rememberMe, ClientInfo client) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        OffsetDateTime now = OffsetDateTime.now(clock);

        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(TokenHashing.sha256(raw));
        token.setFamilyId(familyId);
        token.setRememberMe(rememberMe);
        token.setExpiresAt(now.plus(rememberMe ? properties.refreshTtl() : properties.sessionRefreshTtl()));
        token.setIpAddress(client.ipAddress());
        token.setUserAgent(client.userAgent());
        token.setCreatedAt(now);
        repository.save(token);
        return raw;
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public Rotation rotate(String raw, ClientInfo client) {
        RefreshToken token = repository.findByTokenHashForUpdate(TokenHashing.sha256(raw))
                .orElseThrow(RefreshTokenService::invalid);
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (token.getRevokedAt() != null) {
            repository.revokeFamily(token.getFamilyId(), now, "REUSE_DETECTED");
            log.warn("Phát hiện dùng lại refresh token đã thu hồi: user {}, family {}", token.getUserId(),
                    token.getFamilyId());
            throw invalid();
        }
        if (!token.getExpiresAt().isAfter(now)) {
            throw invalid();
        }
        token.setRevokedAt(now);
        token.setRevokeReason("ROTATED");
        String newRaw = issue(token.getUserId(), token.getFamilyId(), token.isRememberMe(), client);
        return new Rotation(token.getUserId(), newRaw, token.isRememberMe());
    }

    @Transactional
    public void revokeFamilyOf(String raw, String reason) {
        repository.findByTokenHash(TokenHashing.sha256(raw))
                .ifPresent(t -> repository.revokeFamily(t.getFamilyId(), OffsetDateTime.now(clock), reason));
    }

    @Transactional
    public void revokeAllForUser(Long userId, String reason) {
        repository.revokeAllForUser(userId, OffsetDateTime.now(clock), reason);
    }

    @Transactional(readOnly = true)
    public boolean isRememberMe(String raw) {
        return raw != null && repository.findByTokenHash(TokenHashing.sha256(raw))
                .map(RefreshToken::isRememberMe).orElse(false);
    }

    private static BusinessException invalid() {
        return new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
    }
}
