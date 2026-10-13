package com.bihome.residentapp;

import com.bihome.residentapp.dto.ResidentAuthDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "App cư dân – đăng nhập")
@RestController
@RequestMapping(ResidentSecurityConfig.PREFIX + "/auth")
@RequiredArgsConstructor
public class ResidentAuthController {

    private static final String DEVICE_HEADER = "X-Device-Name";

    private final ResidentAuthService authService;
    private final ResidentContext context;

    @Operation(summary = "Đăng nhập bằng số điện thoại",
            description = "Trả access token (Bearer, chỉ dùng cho /api/v1/resident/**) và refresh token trong body. "
                    + "mustChangePassword = true: phải đổi mật khẩu tạm trước khi dùng các API khác.")
    @PostMapping("/login")
    public ResidentAuthDtos.TokenResponse login(@Valid @RequestBody ResidentAuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @Operation(summary = "Làm mới phiên", description = "Refresh token xoay vòng: token cũ hết hiệu lực ngay.")
    @PostMapping("/refresh")
    public ResidentAuthDtos.TokenResponse refresh(@Valid @RequestBody ResidentAuthDtos.RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @Operation(summary = "Đăng xuất thiết bị", description = "Thu hồi refresh token và bỏ push token của máy.")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestBody ResidentAuthDtos.LogoutRequest request) {
        authService.logout(request);
    }

    @Operation(summary = "Đổi mật khẩu", description = "Đăng xuất mọi thiết bị khác, trả phiên mới cho máy đang dùng.")
    @PostMapping("/change-password")
    public ResidentAuthDtos.TokenResponse changePassword(
            @Valid @RequestBody ResidentAuthDtos.ChangePasswordRequest request,
            @RequestHeader(value = DEVICE_HEADER, required = false) String deviceName) {
        return authService.changePassword(context.current().accountId(), request, deviceName);
    }
}
