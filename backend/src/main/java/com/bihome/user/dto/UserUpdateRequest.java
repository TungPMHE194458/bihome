package com.bihome.user.dto;

import com.bihome.common.util.PhoneNumbers;
import com.bihome.user.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Tên đăng nhập không đổi được; {@code version} để chống ghi đè khi hai người cùng sửa. */
public record UserUpdateRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 150, message = "Email tối đa 150 ký tự")
        String email,

        @Pattern(regexp = PhoneNumbers.REGEX, message = PhoneNumbers.MESSAGE)
        String phone,

        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        String fullName,

        Gender gender,

        @Past(message = "Ngày sinh phải trước ngày hôm nay")
        LocalDate dateOfBirth,

        @Size(max = 100, message = "Chức vụ tối đa 100 ký tự")
        String jobTitle,

        @Size(max = 100, message = "Phòng ban tối đa 100 ký tự")
        String department,

        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String address,

        @Size(max = 1000, message = "Giới thiệu tối đa 1000 ký tự")
        String bio,

        @NotNull(message = "Thiếu phiên bản dữ liệu")
        Long version) {
}
