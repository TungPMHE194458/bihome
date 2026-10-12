package com.bihome.user;

import com.bihome.user.dto.RoleDtos;
import com.bihome.user.dto.RoleSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Vai trò & phân quyền")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roles;
    private final RoleService roleService;
    private final UserMapper mapper;

    @Operation(summary = "Danh sách vai trò (dùng cho dropdown)")
    @GetMapping("/roles")
    @PreAuthorize("hasAnyAuthority('ROLE_READ', 'USER_READ')")
    @Transactional(readOnly = true)
    public List<RoleSummary> list() {
        return roles.findAllByOrderByIdAsc().stream().map(mapper::toRoleSummary).toList();
    }

    @Operation(summary = "Vai trò kèm quyền và số người dùng (màn hình phân quyền)")
    @GetMapping("/roles/overview")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public List<RoleDtos.Response> overview() {
        return roleService.list();
    }

    @Operation(summary = "Chi tiết vai trò")
    @GetMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public RoleDtos.Response get(@PathVariable Long id) {
        return roleService.get(id);
    }

    @Operation(summary = "Danh mục quyền", description = "Mọi quyền {MODULE}_{READ|WRITE|DELETE|EXPORT} đã seed sẵn.")
    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('ROLE_READ')")
    public List<RoleDtos.PermissionResponse> permissions() {
        return roleService.permissions();
    }

    @Operation(summary = "Tạo vai trò")
    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ROLE_WRITE')")
    public RoleDtos.Response create(@Valid @RequestBody RoleDtos.Request request) {
        return roleService.create(request);
    }

    @Operation(summary = "Sửa tên / mô tả / quyền của vai trò", description = "Có hiệu lực ngay với mọi người dùng có vai trò.")
    @PutMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('ROLE_WRITE')")
    public RoleDtos.Response update(@PathVariable Long id, @Valid @RequestBody RoleDtos.Request request) {
        return roleService.update(id, request);
    }

    @Operation(summary = "Xoá vai trò tự tạo chưa gán cho ai")
    @DeleteMapping("/roles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_DELETE')")
    public void delete(@PathVariable Long id) {
        roleService.delete(id);
    }
}
