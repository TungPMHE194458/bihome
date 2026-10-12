package com.bihome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.user.AppUser;
import com.bihome.user.UserStatus;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class AuthControllerIT extends AbstractIT {

    private static final String COOKIE = "bihome_refresh";

    @Autowired
    LoginHistoryRepository loginHistory;

    @Test
    void loginReturnsAccessTokenAndHttpOnlySessionCookie() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");

        MvcResult result = loginResult(username, PASSWORD);

        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith(COOKIE + "=").contains("HttpOnly", "Path=/api/v1/auth", "SameSite=Lax")
                .doesNotContain("Max-Age");
        assertThat(objectMapper.readTree(result.getResponse().getContentAsString()).get("expiresIn").asLong())
                .isEqualTo(900);

        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken(result))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.profile.fullName").value("Người dùng " + username))
                .andExpect(jsonPath("$.roles[0].code").value("STAFF"))
                .andExpect(jsonPath("$.roles[0].name").value("Nhân viên vận hành"))
                .andExpect(jsonPath("$.permissions", Matchers.hasItems("TICKET_READ", "TICKET_WRITE")))
                .andExpect(jsonPath("$.permissions", Matchers.not(Matchers.hasItem("USER_READ"))))
                .andExpect(jsonPath("$.allBuildings").value(false))
                .andExpect(jsonPath("$.lastLoginAt").isNotEmpty());

        List<LoginHistory> history = loginHistory.findByLoginNameOrderByIdDesc(username);
        assertThat(history).hasSize(1);
        assertThat(history.getFirst().isSuccess()).isTrue();
    }

    @Test
    void rememberMeSetsPersistentCookie() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");

        String setCookie = login(username, PASSWORD, true).getResponse().getHeader(HttpHeaders.SET_COOKIE);

        assertThat(setCookie).contains("Max-Age=" + Duration.ofDays(7).toSeconds());
    }

    @Test
    void loginAcceptsEmailCaseInsensitively() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");

        loginResult((username + "@test.local").toUpperCase(), PASSWORD);
    }

    @Test
    void superAdminGetsEveryPermissionAndAllBuildings() throws Exception {
        String username = unique("admin");
        createUser(username, "SUPER_ADMIN");

        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(login(username))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allBuildings").value(true))
                .andExpect(jsonPath("$.permissions.length()").value(26 * 4))
                .andExpect(jsonPath("$.permissions", Matchers.hasItems("USER_WRITE", "SOS_EXPORT")));
    }

    @Test
    void wrongPasswordAndUnknownUserGetTheSameError() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");

        postLogin(username, "Sai@12345", false)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.detail").value("Tên đăng nhập hoặc mật khẩu không đúng."));
        postLogin(unique("ghost"), "Sai@12345", false)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        LoginHistory failure = loginHistory.findByLoginNameOrderByIdDesc(username).getFirst();
        assertThat(failure.isSuccess()).isFalse();
        assertThat(failure.getFailureReason()).isEqualTo("BAD_PASSWORD");
    }

    @Test
    void fiveWrongPasswordsLockTheAccountEvenForTheCorrectPassword() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");

        for (int i = 0; i < 4; i++) {
            postLogin(username, "Sai@12345", false).andExpect(status().isUnauthorized());
        }
        postLogin(username, "Sai@12345", false)
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("ACCOUNT_TEMPORARILY_LOCKED"))
                .andExpect(jsonPath("$.detail", Matchers.matchesPattern("Tài khoản tạm khoá đến \\d{2}:\\d{2}.*")));

        postLogin(username, PASSWORD, false).andExpect(status().isLocked());
        assertThat(userRepository.findByLogin(username).orElseThrow().getLockedUntil()).isNotNull();
    }

    @Test
    void inactiveAndLockedUsersCannotLoginEvenWithCorrectPassword() throws Exception {
        String inactive = unique("staff");
        setStatus(createUser(inactive, "STAFF"), UserStatus.INACTIVE);
        String locked = unique("staff");
        setStatus(createUser(locked, "STAFF"), UserStatus.LOCKED);

        postLogin(inactive, PASSWORD, false)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_INACTIVE"));
        postLogin(locked, PASSWORD, false)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void refreshRotatesTheTokenAndIssuesANewAccessToken() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");
        String first = refreshCookie(loginResult(username, PASSWORD));

        MvcResult rotated = refresh(first).andExpect(status().isOk()).andReturn();
        String second = refreshCookie(rotated);

        assertThat(second).isNotBlank().isNotEqualTo(first);
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken(rotated))))
                .andExpect(status().isOk());
        refresh(second).andExpect(status().isOk());
    }

    @Test
    void reusingARotatedTokenRevokesTheWholeFamily() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");
        String first = refreshCookie(loginResult(username, PASSWORD));
        String second = refreshCookie(refresh(first).andExpect(status().isOk()).andReturn());

        refresh(first)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        refresh(second).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshWithoutOrWithUnknownCookieReturns401() throws Exception {
        mvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
        refresh("not-a-real-token").andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesTheRefreshTokenAndClearsTheCookie() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");
        String token = refreshCookie(loginResult(username, PASSWORD));

        MvcResult result = mvc.perform(post("/api/v1/auth/logout").cookie(new Cookie(COOKIE, token)))
                .andExpect(status().isNoContent()).andReturn();

        assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        refresh(token).andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointsRejectMissingOrInvalidTokens() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer("abc.def.ghi")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessTokenStopsWorkingOnceTheUserIsLocked() throws Exception {
        String username = unique("staff");
        AppUser user = createUser(username, "STAFF");
        String token = login(username);

        setStatus(user, UserStatus.LOCKED);

        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forgotAndResetPasswordWithOtp() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");
        String email = username + "@test.local";
        String oldSession = refreshCookie(loginResult(username, PASSWORD));

        postJson("/api/v1/auth/forgot-password", Map.of("email", email)).andExpect(status().isNoContent());
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(otpNotifier).sendPasswordResetOtp(eq(email), anyString(), otp.capture(), any());
        assertThat(otp.getValue()).matches("\\d{6}");

        String wrongOtp = otp.getValue().equals("000000") ? "111111" : "000000";
        postJson("/api/v1/auth/reset-password", reset(email, wrongOtp, "MoiMoi@2026", "MoiMoi@2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_OTP"))
                .andExpect(jsonPath("$.errors[0].field").value("otp"));

        postJson("/api/v1/auth/reset-password", reset(email, otp.getValue(), "MoiMoi@2026", "MoiMoi@2026"))
                .andExpect(status().isNoContent());

        postLogin(username, PASSWORD, false).andExpect(status().isUnauthorized());
        loginResult(username, "MoiMoi@2026");
        refresh(oldSession).andExpect(status().isUnauthorized());
        postJson("/api/v1/auth/reset-password", reset(email, otp.getValue(), "Khac@2026x", "Khac@2026x"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void forgotPasswordForUnknownEmailStillReturns204() throws Exception {
        postJson("/api/v1/auth/forgot-password", Map.of("email", unique("ghost") + "@test.local"))
                .andExpect(status().isNoContent());

        verify(otpNotifier, never()).sendPasswordResetOtp(any(), any(), any(), any());
    }

    @Test
    void resetPasswordValidatesPolicyAndConfirmation() throws Exception {
        postJson("/api/v1/auth/reset-password", reset("a@test.local", "123456", "yeu", "yeu"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='newPassword')]").exists());
        postJson("/api/v1/auth/reset-password", reset("a@test.local", "123456", "MoiMoi@2026", "Khac@2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("confirmPassword"));
    }

    @Test
    void changePasswordRevokesOtherSessionsButKeepsTheCurrentDeviceLoggedIn() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");
        MvcResult current = loginResult(username, PASSWORD);
        String otherDevice = refreshCookie(loginResult(username, PASSWORD));

        MvcResult changed = mvc.perform(post("/api/v1/auth/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(accessToken(current)))
                        .cookie(new Cookie(COOKIE, refreshCookie(current)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("currentPassword", PASSWORD,
                                "newPassword", "MoiMoi@2026", "confirmPassword", "MoiMoi@2026"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(false))
                .andReturn();

        refresh(otherDevice).andExpect(status().isUnauthorized());
        refresh(refreshCookie(current)).andExpect(status().isUnauthorized());
        refresh(refreshCookie(changed)).andExpect(status().isOk());
        loginResult(username, "MoiMoi@2026");
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() throws Exception {
        String username = unique("staff");
        createUser(username, "STAFF");

        mvc.perform(post("/api/v1/auth/change-password")
                        .header(HttpHeaders.AUTHORIZATION, bearer(login(username)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("currentPassword", "Sai@12345",
                                "newPassword", "MoiMoi@2026", "confirmPassword", "MoiMoi@2026"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("currentPassword"));
    }

    @Test
    void userWhoMustChangePasswordIsLimitedToAuthEndpoints() throws Exception {
        String username = unique("staff");
        AppUser user = createUser(username, "STAFF");
        user.setMustChangePassword(true);
        userRepository.saveAndFlush(user);
        MvcResult result = loginResult(username, PASSWORD);
        String token = accessToken(result);

        assertThat(objectMapper.readTree(result.getResponse().getContentAsString()).get("mustChangePassword")
                .asBoolean()).isTrue();
        mvc.perform(get("/api/v1/profile").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    private ResultActions postLogin(String username, String password, boolean rememberMe) throws Exception {
        return postJson("/api/v1/auth/login", Map.of("username", username, "password", password,
                "rememberMe", rememberMe));
    }

    private MvcResult login(String username, String password, boolean rememberMe) throws Exception {
        return postLogin(username, password, rememberMe).andExpect(status().isOk()).andReturn();
    }

    private ResultActions refresh(String token) throws Exception {
        return mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(COOKIE, token)));
    }

    private ResultActions postJson(String path, Object body) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private static Map<String, String> reset(String email, String otp, String password, String confirm) {
        return Map.of("email", email, "otp", otp, "newPassword", password, "confirmPassword", confirm);
    }

    private static String refreshCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie(COOKIE);
        assertThat(cookie).as("refresh cookie").isNotNull();
        return cookie.getValue();
    }

    private void setStatus(AppUser user, UserStatus status) {
        AppUser fresh = userRepository.findById(user.getId()).orElseThrow();
        fresh.setStatus(status);
        userRepository.saveAndFlush(fresh);
    }
}
