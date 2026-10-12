package com.bihome.user;

import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.user.dto.UserCreateRequest;
import com.bihome.user.dto.UserRequests;
import com.bihome.user.dto.UserResponse;
import com.bihome.user.dto.UserSummary;
import com.bihome.user.dto.UserUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Người dùng hệ thống")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Danh sách người dùng", description = "Lọc theo từ khoá, tên đăng nhập, họ tên, email, vai trò, trạng thái.")
    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    public PageResponse<UserSummary> list(@ParameterObject UserRequests.Filter filter,
                                          @ParameterObject PageParams pageParams) {
        return userService.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết người dùng")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_READ')")
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @Operation(summary = "Tạo người dùng", description = "Sinh mật khẩu tạm (trả về một lần), bắt đổi khi đăng nhập lần đầu.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserRequests.Created create(@Valid @RequestBody UserCreateRequest request) {
        return userService.create(request);
    }

    @Operation(summary = "Cập nhật người dùng")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        return userService.update(id, request);
    }

    @Operation(summary = "Gán vai trò")
    @PutMapping("/{id}/roles")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserResponse assignRoles(@PathVariable Long id, @Valid @RequestBody UserRequests.AssignRoles request,
                                    @AuthenticationPrincipal AuthUser actor) {
        return userService.assignRoles(id, request.roleCodes(), actor);
    }

    @Operation(summary = "Gán tòa nhà phụ trách")
    @PutMapping("/{id}/buildings")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserResponse assignBuildings(@PathVariable Long id, @Valid @RequestBody UserRequests.AssignBuildings request) {
        return userService.assignBuildings(id, request.buildingIds());
    }

    @Operation(summary = "Khoá / mở khoá / ngừng hoạt động")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserResponse changeStatus(@PathVariable Long id, @Valid @RequestBody UserRequests.ChangeStatus request,
                                     @AuthenticationPrincipal AuthUser actor) {
        return userService.changeStatus(id, request.status(), actor);
    }

    @Operation(summary = "Đặt lại mật khẩu", description = "Sinh mật khẩu tạm và thu hồi mọi phiên đăng nhập của người dùng.")
    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('USER_WRITE')")
    public UserRequests.TemporaryPassword resetPassword(@PathVariable Long id, @AuthenticationPrincipal AuthUser actor) {
        return userService.resetPassword(id, actor);
    }
}
