package com.bihome.user;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.CurrentUser;
import com.bihome.user.dto.RoleDtos;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Vai trò & phân quyền. Admin hệ thống luôn có mọi quyền (không lưu ROLE_PERMISSION, không sửa được); vai trò hệ
 * thống sửa được quyền nhưng không xoá được; vai trò tự tạo xoá được khi chưa gán cho ai. Đổi quyền có hiệu lực ngay
 * vì {@code AuthUser} được nạp lại ở mỗi request.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService {

    private final RoleRepository roles;
    private final PermissionRepository permissions;

    public List<RoleDtos.Response> list() {
        Map<Long, Long> counts = userCounts();
        return roles.findAllWithPermissions().stream().map(r -> toResponse(r, counts)).toList();
    }

    public RoleDtos.Response get(Long id) {
        return toResponse(require(id), userCounts());
    }

    public List<RoleDtos.PermissionResponse> permissions() {
        return permissions.findAllByOrderByModuleCodeAscIdAsc().stream()
                .map(p -> new RoleDtos.PermissionResponse(p.getCode(), p.getModuleCode(), p.getActionCode(), p.getName()))
                .toList();
    }

    @Transactional
    public RoleDtos.Response create(RoleDtos.Request req) {
        String code = req.code() == null ? "" : req.code().trim();
        if (code.isEmpty()) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "code", "Mã vai trò không được để trống");
        }
        if (roles.existsByCode(code)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã vai trò đã tồn tại.");
        }
        Role role = new Role();
        role.setCode(code);
        role.setSystem(false);
        apply(role, req);
        roles.saveAndFlush(role);
        return toResponse(role, userCounts());
    }

    @Transactional
    public RoleDtos.Response update(Long id, RoleDtos.Request req) {
        Role role = require(id);
        if (AuthUser.SUPER_ADMIN.equals(role.getCode())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Admin hệ thống luôn có toàn quyền, không sửa được.");
        }
        if (req.version() == null || !Objects.equals(role.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        apply(role, req);
        roles.saveAndFlush(role);
        return toResponse(role, userCounts());
    }

    @Transactional
    public void delete(Long id) {
        Role role = require(id);
        if (role.isSystem()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Vai trò hệ thống không xoá được.");
        }
        long users = userCounts().getOrDefault(id, 0L);
        if (users > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Vai trò đang được gán cho " + users + " người dùng, hãy gỡ vai trò khỏi họ trước.");
        }
        roles.delete(role);
    }

    private Role require(Long id) {
        return roles.findWithPermissionsById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò."));
    }

    private void apply(Role role, RoleDtos.Request req) {
        role.setName(req.name().trim());
        role.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        Set<String> wanted = new HashSet<>(req.permissions());
        List<Permission> found = permissions.findByCodeIn(wanted);
        if (found.size() != wanted.size()) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "permissions", "Có quyền không hợp lệ.");
        }
        AuthUser actor = CurrentUser.get();
        if (!actor.superAdmin() && !actor.permissions().containsAll(wanted)) {
            throw BusinessException.field(ErrorCode.FORBIDDEN, "permissions", "Chỉ cấp được những quyền bạn đang có.");
        }
        role.setPermissions(new HashSet<>(found));
    }

    private Map<Long, Long> userCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : roles.countUsersByRole()) {
            counts.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private static RoleDtos.Response toResponse(Role r, Map<Long, Long> counts) {
        boolean all = AuthUser.SUPER_ADMIN.equals(r.getCode());
        List<String> codes = all ? List.of()
                : r.getPermissions().stream().map(Permission::getCode).sorted().collect(Collectors.toList());
        return new RoleDtos.Response(r.getId(), r.getCode(), r.getName(), r.getDescription(), r.isSystem(), all,
                counts.getOrDefault(r.getId(), 0L), codes, r.getUpdatedAt(), r.getUpdatedBy(), r.getVersion());
    }
}
