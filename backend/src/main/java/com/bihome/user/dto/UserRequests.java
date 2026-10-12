package com.bihome.user.dto;

import com.bihome.user.UserStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.Set;

/** Các request nhỏ của màn hình Người dùng hệ thống và Hồ sơ cá nhân. */
public final class UserRequests {

    private UserRequests() {
    }

    public record AssignRoles(
            @NotEmpty(message = "Phải chọn ít nhất một vai trò") Set<@NotBlank String> roleCodes) {
    }

    public record AssignBuildings(
            @NotNull(message = "Danh sách tòa nhà không được để trống") Set<@NotNull @Positive Long> buildingIds) {
    }

    public record ChangeStatus(@NotNull(message = "Trạng thái không được để trống") UserStatus status) {
    }

    /** {@code fileId} = null để gỡ ảnh đại diện. */
    public record ChangeAvatar(@Positive Long fileId) {
    }

    public record TemporaryPassword(String temporaryPassword) {
    }

    public record Created(UserResponse user, String temporaryPassword) {
    }

    public record Filter(String keyword, String username, String fullName, String email, String role,
                         UserStatus status) {
    }
}
