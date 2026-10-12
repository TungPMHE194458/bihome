package com.bihome.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.auth.RefreshTokenService;
import com.bihome.building.BuildingRepository;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.FieldErrorItem;
import com.bihome.common.security.AuthUser;
import com.bihome.user.dto.UserCreateRequest;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final AuthUser ADMIN = new AuthUser(1L, "admin", Set.of("SUPER_ADMIN"), Set.of(), Set.of(),
            true, false);

    @Mock AppUserRepository users;
    @Mock RoleRepository roles;
    @Mock BuildingRepository buildings;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TemporaryPasswordGenerator passwordGenerator;
    @Mock RefreshTokenService refreshTokens;
    @Mock UserMapper mapper;
    @Mock EntityManager entityManager;
    @Mock Clock clock;

    @InjectMocks
    UserService service;

    @BeforeEach
    void signIn() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(ADMIN, null, ADMIN.authorities()));
    }

    @AfterEach
    void signOut() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createReportsEveryDuplicateFieldAtOnce() {
        when(users.existsByUsername("an.nguyen")).thenReturn(true);
        when(users.existsByEmail("an@bihome.vn")).thenReturn(true);
        when(users.existsByPhone("0912345678")).thenReturn(false);
        UserCreateRequest request = new UserCreateRequest(" An.Nguyen ", " AN@bihome.vn ", "+84912345678",
                "Nguyễn An", null, null, null, null, null, Set.of("STAFF"), Set.of());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors()).extracting(FieldErrorItem::field).containsExactly("username", "email");
                });
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void adminCannotLockThemselvesOut() {
        assertThatThrownBy(() -> service.changeStatus(1L, UserStatus.LOCKED, ADMIN))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.BUSINESS_RULE_VIOLATION));
        verify(users, never()).findById(any());
    }

    @Test
    void adminCannotRemoveTheirOwnSuperAdminRole() {
        Role staff = new Role();
        staff.setCode("STAFF");
        when(users.findById(1L)).thenReturn(Optional.of(new AppUser()));
        when(roles.findByCodeIn(Set.of("STAFF"))).thenReturn(List.of(staff));

        assertThatThrownBy(() -> service.assignRoles(1L, Set.of("staff"), ADMIN))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Admin hệ thống");
    }

    @Test
    void lockingAnotherUserRevokesTheirSessions() {
        AppUser target = new AppUser();
        target.setId(2L);
        when(users.findById(2L)).thenReturn(Optional.of(target));

        service.changeStatus(2L, UserStatus.LOCKED, ADMIN);

        assertThat(target.getStatus()).isEqualTo(UserStatus.LOCKED);
        verify(refreshTokens).revokeAllForUser(2L, "USER_LOCKED");
    }
}
