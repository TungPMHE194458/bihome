package com.bihome.residentapp.dto;

import com.bihome.common.util.PhoneNumbers;
import com.bihome.residentapp.ResidentAccount;
import com.bihome.user.PasswordPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public final class ResidentAuthDtos {

    private ResidentAuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Vui lòng nhập số điện thoại")
            @Pattern(regexp = PhoneNumbers.REGEX, message = PhoneNumbers.MESSAGE)
            String phone,
            @NotBlank(message = "Vui lòng nhập mật khẩu") @Size(max = 128) String password,
            @Size(max = 150) String deviceName) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(String refreshToken, @Size(max = 255) String pushToken) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String currentPassword,
            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
            String newPassword) {
    }

    public record DeleteAccountRequest(@NotBlank(message = "Vui lòng nhập mật khẩu") String password) {
    }

    /** refreshToken trả trong body (app lưu ở Keychain / Keystore), không dùng cookie như web. */
    public record TokenResponse(String accessToken, String refreshToken, String tokenType, long expiresIn,
                                boolean mustChangePassword) {
    }

    // ------------------------------------------------------------ Web BQL: quản lý tài khoản app của cư dân

    public record AccountResponse(Long residentId, String phone, ResidentAccount.Status status, boolean mustChangePassword,
                                  OffsetDateTime lastLoginAt, OffsetDateTime createdAt, String createdBy) {
    }

    /** Mật khẩu tạm chỉ trả một lần khi tạo / đặt lại. */
    public record TemporaryPasswordResponse(String phone, String temporaryPassword) {
    }
}
