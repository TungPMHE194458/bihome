package com.bihome.auth;

import com.bihome.auth.dto.AuthRequests;
import com.bihome.auth.dto.TokenResponse;
import com.bihome.common.security.AuthUser;
import com.bihome.user.ProfileService;
import com.bihome.user.dto.MeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Xác thực")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ProfileService profileService;
    private final RefreshTokenCookies cookies;

    @Operation(summary = "Đăng nhập", description = "Bằng tên đăng nhập hoặc email. Sai 5 lần liên tiếp → khoá 15 phút.")
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody AuthRequests.Login request, HttpServletRequest http) {
        return withRefreshCookie(authService.login(request, ClientInfo.from(http)));
    }

    @Operation(summary = "Làm mới access token", description = "Dùng refresh token trong cookie; token được xoay vòng mỗi lần gọi.")
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(HttpServletRequest http) {
        return withRefreshCookie(authService.refresh(cookies.read(http), ClientInfo.from(http)));
    }

    @Operation(summary = "Đăng xuất")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest http) {
        authService.logout(cookies.read(http));
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @Operation(summary = "Quên mật khẩu", description = "Gửi OTP 6 số (hiệu lực 10 phút). Luôn trả 204 dù email có tồn tại hay không.")
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody AuthRequests.ForgotPassword request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Đặt lại mật khẩu bằng OTP")
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody AuthRequests.ResetPassword request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Đổi mật khẩu", description = "Thu hồi mọi phiên đăng nhập khác và cấp phiên mới cho thiết bị hiện tại.")
    @PostMapping("/change-password")
    public ResponseEntity<TokenResponse> changePassword(@AuthenticationPrincipal AuthUser me,
                                                        @Valid @RequestBody AuthRequests.ChangePassword request,
                                                        HttpServletRequest http) {
        return withRefreshCookie(authService.changePassword(me, request, cookies.read(http), ClientInfo.from(http)));
    }

    @Operation(summary = "Thông tin người dùng hiện tại", description = "Gồm hồ sơ, vai trò, quyền và tòa nhà được gán.")
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AuthUser me) {
        return profileService.get(me);
    }

    private ResponseEntity<TokenResponse> withRefreshCookie(AuthService.LoginResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.build(result.refreshToken(), result.rememberMe()).toString())
                .body(result.tokens());
    }
}
