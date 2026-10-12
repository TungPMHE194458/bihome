package com.bihome.user.dto;

import com.bihome.user.Gender;
import java.time.LocalDate;

public record ProfileResponse(
        String fullName,
        Long avatarFileId,
        String avatarUrl,
        Gender gender,
        LocalDate dateOfBirth,
        String jobTitle,
        String department,
        String address,
        String bio) {
}
