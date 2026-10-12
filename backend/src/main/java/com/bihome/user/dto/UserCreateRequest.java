package com.bihome.user.dto;

import com.bihome.common.util.PhoneNumbers;
import com.bihome.user.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;

public record UserCreateRequest(
        @NotBlank(message = "Tên đăng nhập không được để trống")
        @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$",
                message = "Tên đăng nhập dài 3–50 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -")
        String username,

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

        @NotEmpty(message = "Phải chọn ít nhất một vai trò")
        Set<@NotBlank String> roleCodes,

        Set<@NotNull @Positive Long> buildingIds) {
}
