package com.bihome.residentapp;

import com.bihome.auth.TokenHashing;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.JwtService;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.AppAccountStatus;
import com.bihome.resident.ResidentRepository;
import com.bihome.residentapp.dto.ResidentAppDtos;
import com.bihome.residentapp.dto.ResidentAuthDtos;
import com.bihome.setting.SettingService;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đăng nhập app cư dân bằng số điện thoại + mật khẩu (BQL cấp mật khẩu tạm, lần đầu bắt đổi). Khoá tạm sau nhiều lần
 * sai theo Cấu hình chung như tài khoản nhân viên. Refresh token xoay vòng; dùng lại token đã bị thay → thu hồi mọi
 * phiên của tài khoản (nghi lộ token).
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class ResidentAuthService {

    private static final int TOKEN_BYTES = 32;
    private static final DateTimeFormatter HOUR_MINUTE = DateTimeFormatter.ofPattern("HH:mm");
    static final String BAD_CREDENTIALS = "Số điện thoại hoặc mật khẩu không đúng.";

    private final ResidentAccountRepository accounts;
    private final ResidentRefreshTokenRepository refreshTokens;
    private final ResidentPushTokenRepository pushTokens;
    private final ResidentRepository residents;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final SettingService settingService;
    private final ResidentAppProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    /** So khớp với hash giả khi không có tài khoản để thời gian phản hồi không lộ số điện thoại nào đã đăng ký. */
    private final String dummyHash;

    public ResidentAuthService(ResidentAccountRepository accounts, ResidentRefreshTokenRepository refreshTokens,
                               ResidentPushTokenRepository pushTokens, ResidentRepository residents, JwtService jwtService,
                               PasswordEncoder passwordEncoder, SettingService settingService,
                               ResidentAppProperties properties, Clock clock) {
        this.accounts = accounts;
        this.refreshTokens = refreshTokens;
        this.pushTokens = pushTokens;
        this.residents = residents;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.settingService = settingService;
        this.properties = properties;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /** Không rollback khi ném BusinessException để vẫn lưu số lần sai / thời điểm khoá. */
    @Transactional(noRollbackFor = BusinessException.class)
    public ResidentAuthDtos.TokenResponse login(ResidentAuthDtos.LoginRequest req) {
        String phone = PhoneNumbers.normalize(req.phone());
        OffsetDateTime now = OffsetDateTime.now(clock);
        ResidentAccount account = accounts.findByPhone(phone).orElse(null);
        if (account == null) {
            passwordEncoder.matches(req.password(), dummyHash);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, BAD_CREDENTIALS);
        }
        if (account.isTemporarilyLocked(now)) {
            throw temporarilyLocked(account.getLockedUntil(), settingService.current().maxFailedLogins());
        }
        if (!passwordEncoder.matches(req.password(), account.getPasswordHash())) {
            int failures = account.getFailedLoginCount() + 1;
            SettingService.Snapshot policy = settingService.current();
            if (failures >= policy.maxFailedLogins()) {
                OffsetDateTime lockedUntil = now.plus(Duration.ofMinutes(policy.lockMinutes()));
                accounts.recordFailedLogin(account.getId(), 0, lockedUntil);
                throw temporarilyLocked(lockedUntil, policy.maxFailedLogins());
            }
            accounts.recordFailedLogin(account.getId(), failures, null);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, BAD_CREDENTIALS);
        }
        if (account.getStatus() == ResidentAccount.Status.LOCKED) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, "Tài khoản app đã bị khoá. Vui lòng liên hệ Ban quản lý.");
        }
        requireLiving(account);
        accounts.recordSuccessfulLogin(account.getId(), now);
        return issueTokens(account, trimToNull(req.deviceName()));
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public ResidentAuthDtos.TokenResponse refresh(String rawRefreshToken) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        ResidentRefreshToken token = refreshTokens.findByTokenHash(TokenHashing.sha256(rawRefreshToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        if (token.getRevokedAt() != null) {
            // Token đã bị thay mà vẫn được dùng lại: coi như lộ, thu hồi mọi phiên của tài khoản.
            log.warn("Refresh token cư dân bị dùng lại, thu hồi mọi phiên của tài khoản {}", token.getAccountId());
            refreshTokens.revokeAll(token.getAccountId(), now);
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        if (!token.getExpiresAt().isAfter(now)) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        ResidentAccount account = accounts.findById(token.getAccountId())
                .filter(a -> a.getStatus() == ResidentAccount.Status.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        token.setRevokedAt(now);
        token.setLastUsedAt(now);
        return issueTokens(account, token.getDeviceName());
    }

    /** Thu hồi phiên của thiết bị và bỏ push token của máy đó; luôn thành công. */
    @Transactional
    public void logout(ResidentAuthDtos.LogoutRequest req) {
        if (req.refreshToken() == null || req.refreshToken().isBlank()) {
            return;
        }
        refreshTokens.findByTokenHash(TokenHashing.sha256(req.refreshToken())).ifPresent(t -> {
            if (t.getRevokedAt() == null) {
                t.setRevokedAt(OffsetDateTime.now(clock));
            }
            if (req.pushToken() != null && !req.pushToken().isBlank()) {
                pushTokens.deleteByTokenAndAccount(req.pushToken().trim(), t.getAccountId());
            }
        });
    }

    /** Đổi mật khẩu: thu hồi mọi phiên cũ (kể cả máy khác), cấp phiên mới cho máy đang dùng. */
    @Transactional
    public ResidentAuthDtos.TokenResponse changePassword(Long accountId, ResidentAuthDtos.ChangePasswordRequest req,
                                                         String deviceName) {
        ResidentAccount account = accounts.findById(accountId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (!passwordEncoder.matches(req.currentPassword(), account.getPasswordHash())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "currentPassword", "Mật khẩu hiện tại không đúng.");
        }
        if (passwordEncoder.matches(req.newPassword(), account.getPasswordHash())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "newPassword", "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        account.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        account.setMustChangePassword(false);
        // Token mới cấp trong cùng giây vẫn hợp lệ: ResidentSessionLoader so ở độ chính xác giây.
        account.setPasswordChangedAt(now);
        refreshTokens.revokeAll(accountId, now);
        accounts.flush();
        return issueTokens(account, deviceName);
    }

    /**
     * Cư dân tự xoá tài khoản app (yêu cầu của App Store / Google Play): xoá tài khoản, phiên và push token. Hồ sơ cư
     * trú, phí, yêu cầu... do BQL quản lý nên vẫn giữ; BQL có thể cấp lại tài khoản khi cư dân cần.
     */
    @Transactional
    public void deleteAccount(Long accountId, String password) {
        ResidentAccount account = accounts.findById(accountId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (!passwordEncoder.matches(password, account.getPasswordHash())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "password", "Mật khẩu không đúng.");
        }
        residents.findById(account.getResidentId()).ifPresent(r -> r.setAppAccountStatus(AppAccountStatus.NONE));
        accounts.delete(account);
    }

    /** Ghi nhận push token của máy; token đã thuộc tài khoản khác (người khác từng đăng nhập máy này) thì chuyển sang. */
    @Transactional
    public void registerPushToken(Long accountId, ResidentAppDtos.PushTokenRequest req) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        String value = req.token().trim();
        ResidentPushToken token = pushTokens.findByToken(value).orElseGet(() -> {
            ResidentPushToken t = new ResidentPushToken();
            t.setToken(value);
            t.setCreatedAt(now);
            return t;
        });
        token.setAccountId(accountId);
        token.setPlatform(req.platform());
        token.setUpdatedAt(now);
        pushTokens.save(token);
    }

    @Transactional
    public void unregisterPushToken(Long accountId, String token) {
        pushTokens.deleteByTokenAndAccount(token.trim(), accountId);
    }

    private void requireLiving(ResidentAccount account) {
        Resident resident = residents.findById(account.getResidentId()).orElseThrow();
        if (resident.activeLinks().isEmpty()) {
            throw new BusinessException(ErrorCode.ACCOUNT_INACTIVE,
                    "Bạn không còn cư trú tại căn hộ nào của tòa nhà. Vui lòng liên hệ Ban quản lý.");
        }
    }

    private ResidentAuthDtos.TokenResponse issueTokens(ResidentAccount account, String deviceName) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        OffsetDateTime now = OffsetDateTime.now(clock);
        ResidentRefreshToken token = new ResidentRefreshToken();
        token.setAccountId(account.getId());
        token.setTokenHash(TokenHashing.sha256(raw));
        token.setDeviceName(deviceName);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plus(properties.refreshTtl()));
        refreshTokens.save(token);
        return new ResidentAuthDtos.TokenResponse(jwtService.createResidentAccessToken(account.getId(), account.getPhone()),
                raw, "Bearer", jwtService.accessTtlSeconds(), account.isMustChangePassword());
    }

    private static BusinessException temporarilyLocked(OffsetDateTime until, int maxFailedLogins) {
        return new BusinessException(ErrorCode.ACCOUNT_TEMPORARILY_LOCKED,
                "Tài khoản tạm khoá đến " + until.atZoneSameInstant(AppTime.ZONE).format(HOUR_MINUTE)
                        + " do đăng nhập sai quá " + maxFailedLogins + " lần.");
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
