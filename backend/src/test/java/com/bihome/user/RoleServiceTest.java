package com.bihome.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.common.exception.BusinessException;
import com.bihome.user.dto.RoleDtos;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock RoleRepository roles;
    @Mock PermissionRepository permissions;
    @InjectMocks RoleService service;

    @Test
    void unknownPermissionCodesAreRejected() {
        when(roles.existsByCode("GUARD")).thenReturn(false);
        when(permissions.findByCodeIn(Set.of("RESIDENT_READ", "FAKE_READ"))).thenReturn(List.of(permission("RESIDENT_READ")));

        assertThatThrownBy(() -> service.create(new RoleDtos.Request("GUARD", "Bảo vệ", null,
                Set.of("RESIDENT_READ", "FAKE_READ"), null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Có quyền không hợp lệ.");
        verify(roles, never()).saveAndFlush(any());
    }

    @Test
    void superAdminIsReportedWithAllPermissionsAndCannotBeEdited() {
        Role admin = role(1L, "SUPER_ADMIN", true);
        when(roles.findWithPermissionsById(1L)).thenReturn(Optional.of(admin));
        when(roles.countUsersByRole()).thenReturn(List.<Object[]>of(new Object[] {1L, 2L}));

        RoleDtos.Response response = service.get(1L);
        assertThat(response.allPermissions()).isTrue();
        assertThat(response.userCount()).isEqualTo(2);
        assertThatThrownBy(() -> service.update(1L, new RoleDtos.Request(null, "Admin", null, Set.of(), 0L)))
                .hasMessage("Admin hệ thống luôn có toàn quyền, không sửa được.");
    }

    @Test
    void customRoleCanBeDeletedOnlyWhenUnassigned() {
        Role custom = role(9L, "GUARD", false);
        when(roles.findWithPermissionsById(9L)).thenReturn(Optional.of(custom));
        when(roles.countUsersByRole()).thenReturn(List.<Object[]>of(new Object[] {9L, 3L}));
        assertThatThrownBy(() -> service.delete(9L))
                .hasMessage("Vai trò đang được gán cho 3 người dùng, hãy gỡ vai trò khỏi họ trước.");

        when(roles.countUsersByRole()).thenReturn(List.of());
        service.delete(9L);
        verify(roles).delete(custom);
    }

    private static Role role(Long id, String code, boolean system) {
        Role r = new Role();
        r.setId(id);
        r.setCode(code);
        r.setName(code);
        r.setSystem(system);
        r.setVersion(0L);
        return r;
    }

    private static Permission permission(String code) {
        Permission p = new Permission();
        p.setCode(code);
        return p;
    }
}
