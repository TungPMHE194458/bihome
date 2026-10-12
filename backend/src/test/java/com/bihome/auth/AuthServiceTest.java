package com.bihome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.auth.dto.AuthRequests;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.JwtService;
import com.bihome.setting.SettingService;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-10-10T08:00:00+07:00");
    private static final ClientInfo CLIENT = new ClientInfo("127.0.0.1", "JUnit");

    @Mock AppUserRepository users;
    @Mock LoginHistoryRepository loginHistory;
    @Mock PasswordResetOtpRepository otps;
    @Mock RefreshTokenService refreshTokens;
    @Mock JwtService jwtService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock OtpNotifier otpNotifier;

    AuthService service;
    AppUser user;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW.toInstant(), ZoneId.of("Asia/Ho_Chi_Minh"));
        SettingService settings = mock(SettingService.class);
        lenient().when(settings.current()).thenReturn(new SettingService.Snapshot(null, null, null, null, null, null,
                null, 5, 15, true));
        service = new AuthService(users, loginHistory, otps, refreshTokens, jwtService, passwordEncoder,
                otpNotifier, settings, clock);
        user = new AppUser();
        user.setId(1L);
        user.setUsername("an");
        user.setPasswordHash("hash");
        user.setStatus(UserStatus.ACTIVE);
        when(users.findByLogin("an")).thenReturn(Optional.of(user));
    }

    private AuthRequests.Login login(String password) {
        return new AuthRequests.Login(" AN ", password, false);
    }

    @Test
    void failureBelowThresholdOnlyIncrementsTheCounter() {
        user.setFailedLoginCount(2);
        when(passwordEncoder.matches("Sai@1234", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(login("Sai@1234"), CLIENT))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_CREDENTIALS));
        verify(users).recordFailedLogin(1L, 3, null);
    }

    @Test
    void fifthFailureLocksForFifteenMinutesAndShowsUnlockTime() {
        user.setFailedLoginCount(4);
        when(passwordEncoder.matches("Sai@1234", "hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(login("Sai@1234"), CLIENT))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.ACCOUNT_TEMPORARILY_LOCKED);
                    assertThat(e.getMessage()).startsWith("Tài khoản tạm khoá đến 08:15");
                });
        verify(users).recordFailedLogin(1L, 0, NOW.plusMinutes(15));
    }

    @Test
    void lockedAccountIsRejectedWithoutCheckingThePassword() {
        user.setLockedUntil(NOW.plusMinutes(5));

        assertThatThrownBy(() -> service.login(login("Admin@123"), CLIENT))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.ACCOUNT_TEMPORARILY_LOCKED));
        verify(passwordEncoder, never()).matches(anyString(), eq("hash"));
    }

    @Test
    void loginSucceedsOnceTheLockHasExpired() {
        user.setLockedUntil(NOW.minusSeconds(1));
        when(passwordEncoder.matches("Admin@123", "hash")).thenReturn(true);
        when(jwtService.createAccessToken(1L, "an")).thenReturn("jwt");
        when(refreshTokens.issue(eq(1L), anyString(), anyBoolean(), any())).thenReturn("refresh");

        AuthService.LoginResult result = service.login(login("Admin@123"), CLIENT);

        assertThat(result.tokens().accessToken()).isEqualTo("jwt");
        assertThat(result.refreshToken()).isEqualTo("refresh");
        verify(users).recordSuccessfulLogin(1L, NOW);
    }

    @Test
    void inactiveUserWithCorrectPasswordGetsNoSession() {
        user.setStatus(UserStatus.INACTIVE);
        when(passwordEncoder.matches("Admin@123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> service.login(login("Admin@123"), CLIENT))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.ACCOUNT_INACTIVE));
        verify(refreshTokens, never()).issue(any(), any(), anyBoolean(), any());
    }
}
