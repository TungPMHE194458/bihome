package com.bihome.auth.dto;

import com.bihome.user.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthRequests {

    private AuthRequests() {
    }

    /** {@code username} nhận cả tên đăng nhập hoặc email. */
    public record Login(
            @NotBlank(message = "Vui lòng nhập tên đăng nhập hoặc email")
            @Size(max = 150, message = "Tên đăng nhập tối đa 150 ký tự")
            String username,
            @NotBlank(message = "Vui lòng nhập mật khẩu")
            @Size(max = 128, message = "Mật khẩu tối đa 128 ký tự")
            String password,
            boolean rememberMe) {
    }

    public record ForgotPassword(
            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không đúng định dạng")
            String email) {
    }

    public record ResetPassword(
            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không đúng định dạng")
            String email,
            @NotBlank(message = "Vui lòng nhập mã OTP")
            @Pattern(regexp = "^\\d{6}$", message = "Mã OTP gồm 6 chữ số")
            String otp,
            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
            String newPassword,
            @NotBlank(message = "Vui lòng nhập lại mật khẩu mới")
            String confirmPassword) {
    }

    public record ChangePassword(
            @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
            String currentPassword,
            @NotBlank(message = "Vui lòng nhập mật khẩu mới")
            @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
            String newPassword,
            @NotBlank(message = "Vui lòng nhập lại mật khẩu mới")
            String confirmPassword) {
    }
}
