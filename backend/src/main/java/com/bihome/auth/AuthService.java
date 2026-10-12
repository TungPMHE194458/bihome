package com.bihome.auth;

import com.bihome.auth.dto.AuthRequests;
import com.bihome.auth.dto.TokenResponse;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.JwtService;
import com.bihome.common.util.AppTime;
import com.bihome.setting.SettingService;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserProfile;
import com.bihome.user.UserStatus;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
public class AuthService {

    static final Duration OTP_TTL = Duration.ofMinutes(10);
    static final Duration OTP_RESEND_INTERVAL = Duration.ofSeconds(60);
    static final int OTP_MAX_ATTEMPTS = 5;
    private static final DateTimeFormatter HOUR_MINUTE = DateTimeFormatter.ofPattern("HH:mm");

    private final AppUserRepository users;
    private final LoginHistoryRepository loginHistory;
    private final PasswordResetOtpRepository otps;
    private final RefreshTokenService refreshTokens;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final OtpNotifier otpNotifier;
    private final SettingService settingService;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    /** So khớp với hash giả khi không có user để thời gian phản hồi không lộ tên đăng nhập có tồn tại hay không. */
    private final String dummyHash;

    public AuthService(AppUserRepository users, LoginHistoryRepository loginHistory, PasswordResetOtpRepository otps,
                       RefreshTokenService refreshTokens, JwtService jwtService, PasswordEncoder passwordEncoder,
                       OtpNotifier otpNotifier, SettingService settingService, Clock clock) {
        this.users = users;
        this.loginHistory = loginHistory;
        this.otps = otps;
        this.refreshTokens = refreshTokens;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.otpNotifier = otpNotifier;
        this.settingService = settingService;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public record LoginResult(TokenResponse tokens, String refreshToken, boolean rememberMe) {
    }

    /** Không rollback khi ném BusinessException để vẫn lưu số lần sai, thời điểm khoá và lịch sử đăng nhập. */
    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResult login(AuthRequests.Login request, ClientInfo client) {
        String login = request.username().trim().toLowerCase(Locale.ROOT);
        OffsetDateTime now = OffsetDateTime.now(clock);
        AppUser user = users.findByLogin(login).orElse(null);
        if (user == null) {
            passwordEncoder.matches(request.password(), dummyHash);
            recordHistory(null, login, false, "USER_NOT_FOUND", client, now);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.isTemporarilyLocked(now)) {
            recordHistory(user.getId(), login, false, "TEMPORARILY_LOCKED", client, now);
            throw temporarilyLocked(user.getLockedUntil(), settingService.current().maxFailedLogins());
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int failures = user.getFailedLoginCount() + 1;
            // Số lần sai cho phép và thời gian khoá lấy từ Cấu hình chung.
            SettingService.Snapshot policy = settingService.current();
            if (failures >= policy.maxFailedLogins()) {
                OffsetDateTime lockedUntil = now.plus(Duration.ofMinutes(policy.lockMinutes()));
                users.recordFailedLogin(user.getId(), 0, lockedUntil);
                recordHistory(user.getId(), login, false, "LOCKED_AFTER_FAILURES", client, now);
                throw temporarilyLocked(lockedUntil, policy.maxFailedLogins());
            }
            users.recordFailedLogin(user.getId(), failures, null);
            recordHistory(user.getId(), login, false, "BAD_PASSWORD", client, now);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.getStatus() == UserStatus.INACTIVE) {
            recordHistory(user.getId(), login, false, "INACTIVE", client, now);
            throw new BusinessException(ErrorCode.ACCOUNT_INACTIVE);
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            recordHistory(user.getId(), login, false, "LOCKED", client, now);
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }
        users.recordSuccessfulLogin(user.getId(), now);
        recordHistory(user.getId(), login, true, null, client, now);
        return startSession(user, request.rememberMe(), client);
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResult refresh(String rawRefreshToken, ClientInfo client) {
        if (rawRefreshToken == null) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        RefreshTokenService.Rotation rotation = refreshTokens.rotate(rawRefreshToken, client);
        AppUser user = users.findById(rotation.userId())
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElse(null);
        if (user == null) {
            refreshTokens.revokeAllForUser(rotation.userId(), "USER_NOT_ACTIVE");
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        return new LoginResult(tokensFor(user), rotation.rawToken(), rotation.rememberMe());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null) {
            refreshTokens.revokeFamilyOf(rawRefreshToken, "LOGOUT");
        }
    }

    /** Luôn trả thành công kể cả khi email không tồn tại, để không lộ danh sách tài khoản. */
    @Transactional
    public void forgotPassword(String email) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        users.findByEmail(normalizeEmail(email))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .ifPresent(user -> {
                    boolean sentRecently = otps.findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                            .filter(o -> o.getCreatedAt().plus(OTP_RESEND_INTERVAL).isAfter(now))
                            .isPresent();
                    if (sentRecently) {
                        return;
                    }
                    otps.invalidateAll(user.getId(), now);
                    String otp = "%06d".formatted(random.nextInt(1_000_000));
                    PasswordResetOtp entity = new PasswordResetOtp();
                    entity.setUserId(user.getId());
                    entity.setOtpHash(hashOtp(user.getId(), otp));
                    entity.setExpiresAt(now.plus(OTP_TTL));
                    entity.setCreatedAt(now);
                    otps.save(entity);
                    UserProfile profile = user.getProfile();
                    otpNotifier.sendPasswordResetOtp(user.getEmail(), profile == null ? null : profile.getFullName(),
                            otp, OTP_TTL);
                });
    }

    /** Không rollback khi sai OTP để vẫn tăng số lần thử. */
    @Transactional(noRollbackFor = BusinessException.class)
    public void resetPassword(AuthRequests.ResetPassword request) {
        requireConfirmation(request.newPassword(), request.confirmPassword());
        AppUser user = users.findByEmail(normalizeEmail(request.email())).orElseThrow(AuthService::invalidOtp);
        PasswordResetOtp otp = otps.findFirstByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(user.getId())
                .orElseThrow(AuthService::invalidOtp);
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (!otp.getExpiresAt().isAfter(now) || otp.getAttemptCount() >= OTP_MAX_ATTEMPTS) {
            throw invalidOtp();
        }
        if (!TokenHashing.constantTimeEquals(hashOtp(user.getId(), request.otp()), otp.getOtpHash())) {
            otp.setAttemptCount(otp.getAttemptCount() + 1);
            throw invalidOtp();
        }
        otp.setUsedAt(now);
        applyNewPassword(user, request.newPassword(), now);
        refreshTokens.revokeAllForUser(user.getId(), "PASSWORD_RESET");
    }

    /** Thu hồi mọi phiên cũ, rồi cấp phiên mới cho thiết bị đang đổi mật khẩu. */
    @Transactional
    public LoginResult changePassword(AuthUser actor, AuthRequests.ChangePassword request,
                                      String currentRefreshToken, ClientInfo client) {
        AppUser user = users.findById(actor.id()).orElseThrow(NotFoundException::new);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "currentPassword", "Mật khẩu hiện tại không đúng.");
        }
        requireConfirmation(request.newPassword(), request.confirmPassword());
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "newPassword",
                    "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        boolean rememberMe = refreshTokens.isRememberMe(currentRefreshToken);
        applyNewPassword(user, request.newPassword(), OffsetDateTime.now(clock));
        refreshTokens.revokeAllForUser(user.getId(), "PASSWORD_CHANGED");
        users.saveAndFlush(user);
        return startSession(user, rememberMe, client);
    }

    private LoginResult startSession(AppUser user, boolean rememberMe, ClientInfo client) {
        String familyId = UUID.randomUUID().toString();
        String refreshToken = refreshTokens.issue(user.getId(), familyId, rememberMe, client);
        return new LoginResult(tokensFor(user), refreshToken, rememberMe);
    }

    private TokenResponse tokensFor(AppUser user) {
        return new TokenResponse(jwtService.createAccessToken(user.getId(), user.getUsername()), "Bearer",
                jwtService.accessTtlSeconds(), user.isMustChangePassword());
    }

    private void applyNewPassword(AppUser user, String rawPassword, OffsetDateTime now) {
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setPasswordChangedAt(now);
        user.setMustChangePassword(false);
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
    }

    private void recordHistory(Long userId, String login, boolean success, String reason, ClientInfo client,
                               OffsetDateTime now) {
        LoginHistory history = new LoginHistory();
        history.setUserId(userId);
        history.setLoginName(login.length() > 150 ? login.substring(0, 150) : login);
        history.setSuccess(success);
        history.setFailureReason(reason);
        history.setIpAddress(client.ipAddress());
        history.setUserAgent(client.userAgent());
        history.setCreatedAt(now);
        loginHistory.save(history);
    }

    private static BusinessException temporarilyLocked(OffsetDateTime until, int maxFailedLogins) {
        return new BusinessException(ErrorCode.ACCOUNT_TEMPORARILY_LOCKED,
                "Tài khoản tạm khoá đến " + until.atZoneSameInstant(AppTime.ZONE).format(HOUR_MINUTE)
                        + " do đăng nhập sai quá " + maxFailedLogins + " lần.");
    }

    private static void requireConfirmation(String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "confirmPassword", "Mật khẩu nhập lại không khớp.");
        }
    }

    private static BusinessException invalidOtp() {
        return BusinessException.field(ErrorCode.INVALID_OTP, "otp", ErrorCode.INVALID_OTP.getDefaultMessage());
    }

    private static String hashOtp(Long userId, String otp) {
        return TokenHashing.sha256(userId + ":" + otp);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
