package com.bihome.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

public final class RoleDtos {

    private RoleDtos() {
    }

    /** @param code chỉ dùng khi tạo mới (không đổi được sau đó) */
    public record Request(
            @Pattern(regexp = "^$|^[A-Z][A-Z0-9_]{1,29}$",
                    message = "Mã vai trò 2–30 ký tự, chữ in hoa không dấu, chữ số và _ (bắt đầu bằng chữ)")
            String code,
            @NotBlank(message = "Tên vai trò không được để trống")
            @Size(max = 100, message = "Tên vai trò tối đa 100 ký tự")
            String name,
            @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description,
            @NotNull(message = "Danh sách quyền không được để trống") Set<@NotBlank String> permissions,
            Long version) {
    }

    /** @param allPermissions Admin hệ thống: luôn có mọi quyền, không sửa được */
    public record Response(
            Long id,
            String code,
            String name,
            String description,
            boolean system,
            boolean allPermissions,
            long userCount,
            List<String> permissions,
            OffsetDateTime updatedAt,
            String updatedBy,
            Long version) {
    }

    public record PermissionResponse(String code, String module, String action, String name) {
    }
}
