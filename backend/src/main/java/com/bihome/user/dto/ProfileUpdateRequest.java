package com.bihome.user.dto;

import com.bihome.common.util.PhoneNumbers;
import com.bihome.user.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Email và tên đăng nhập chỉ đọc ở hồ sơ cá nhân. */
public record ProfileUpdateRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        String fullName,

        @Pattern(regexp = PhoneNumbers.REGEX, message = PhoneNumbers.MESSAGE)
        String phone,

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
        String bio) {
}
