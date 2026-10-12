package com.bihome.user;

import com.bihome.auth.RefreshTokenService;
import com.bihome.building.BuildingRepository;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.FieldErrorItem;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.user.dto.UserCreateRequest;
import com.bihome.user.dto.UserRequests;
import com.bihome.user.dto.UserResponse;
import com.bihome.user.dto.UserSummary;
import com.bihome.user.dto.UserUpdateRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "username", "username",
            "email", "email",
            "fullName", "profile.fullName",
            "status", "status",
            "lastLoginAt", "lastLoginAt",
            "createdAt", "createdAt");

    private final AppUserRepository users;
    private final RoleRepository roles;
    private final BuildingRepository buildings;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator passwordGenerator;
    private final RefreshTokenService refreshTokens;
    private final UserMapper mapper;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<UserSummary> list(UserRequests.Filter filter, PageParams pageParams) {
        return PageResponse.of(users.findAll(UserSpecifications.of(filter).and(manageableScope()),
                pageParams.toPageable(DEFAULT_SORT, SORTS)), mapper::toSummary);
    }

    public UserResponse get(Long id) {
        return mapper.toResponse(find(id));
    }

    @Transactional
    public UserRequests.Created create(UserCreateRequest req) {
        String username = req.username().trim().toLowerCase(Locale.ROOT);
        String email = normalizeEmail(req.email());
        String phone = PhoneNumbers.normalize(req.phone());

        List<FieldErrorItem> conflicts = new ArrayList<>();
        if (users.existsByUsername(username)) {
            conflicts.add(new FieldErrorItem("username", "Tên đăng nhập đã tồn tại."));
        }
        if (users.existsByEmail(email)) {
            conflicts.add(new FieldErrorItem("email", "Email đã được sử dụng."));
        }
        if (phone != null && users.existsByPhone(phone)) {
            conflicts.add(new FieldErrorItem("phone", "Số điện thoại đã được sử dụng."));
        }
        if (!conflicts.isEmpty()) {
            throw new BusinessException(ErrorCode.CONFLICT, conflicts.getFirst().message(), conflicts);
        }

        String temporaryPassword = passwordGenerator.generate();
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setEmail(email);
        user.setPhone(phone);
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setPasswordChangedAt(OffsetDateTime.now(clock));
        user.setMustChangePassword(true);
        user.setRoles(resolveRoles(req.roleCodes()));
        user.setBuildingIds(requireOwnBuildings(resolveBuildings(req.buildingIds())));

        UserProfile profile = new UserProfile();
        profile.setFullName(req.fullName().trim());
        profile.setGender(req.gender());
        profile.setDateOfBirth(req.dateOfBirth());
        profile.setJobTitle(trimToNull(req.jobTitle()));
        profile.setDepartment(trimToNull(req.department()));
        profile.setAddress(trimToNull(req.address()));
        user.attachProfile(profile);

        users.saveAndFlush(user);
        return new UserRequests.Created(mapper.toResponse(user), temporaryPassword);
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest req) {
        AppUser user = find(id);
        if (!Objects.equals(user.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        String email = normalizeEmail(req.email());
        String phone = PhoneNumbers.normalize(req.phone());
        if (users.existsByEmailAndIdNot(email, id)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "email", "Email đã được sử dụng.");
        }
        if (phone != null && users.existsByPhoneAndIdNot(phone, id)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "phone", "Số điện thoại đã được sử dụng.");
        }
        user.setEmail(email);
        user.setPhone(phone);
        UserProfile profile = user.getProfile();
        profile.setFullName(req.fullName().trim());
        profile.setGender(req.gender());
        profile.setDateOfBirth(req.dateOfBirth());
        profile.setJobTitle(trimToNull(req.jobTitle()));
        profile.setDepartment(trimToNull(req.department()));
        profile.setAddress(trimToNull(req.address()));
        profile.setBio(trimToNull(req.bio()));
        // Sửa riêng hồ sơ không làm bẩn APP_USER; ép tăng VERSION ngay (OPTIMISTIC_* chỉ tăng lúc commit,
        // khi đó response đã trả version cũ và lần lưu tiếp theo của FE sẽ bị báo xung đột).
        entityManager.lock(user, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        users.saveAndFlush(user);
        return mapper.toResponse(user);
    }

    @Transactional
    public UserResponse assignRoles(Long id, Set<String> roleCodes, AuthUser actor) {
        AppUser user = find(id);
        Set<Role> newRoles = resolveRoles(roleCodes);
        boolean keepsSuperAdmin = newRoles.stream().anyMatch(r -> AuthUser.SUPER_ADMIN.equals(r.getCode()));
        if (actor.id().equals(id) && actor.superAdmin() && !keepsSuperAdmin) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Không thể tự gỡ vai trò Admin hệ thống của chính mình.");
        }
        user.setRoles(newRoles);
        users.saveAndFlush(user);
        return mapper.toResponse(user);
    }

    @Transactional
    public UserResponse assignBuildings(Long id, Set<Long> buildingIds) {
        AppUser user = find(id);
        Set<Long> resolved = requireOwnBuildings(resolveBuildings(buildingIds));
        AuthUser actor = CurrentUser.get();
        // Người không phải Admin hệ thống chỉ thay phần tòa mình phụ trách; tòa khác của người dùng giữ nguyên.
        if (!actor.superAdmin()) {
            user.getBuildingIds().stream().filter(b -> !actor.buildingIds().contains(b)).forEach(resolved::add);
        }
        user.getBuildingIds().clear();
        user.getBuildingIds().addAll(resolved);
        users.saveAndFlush(user);
        return mapper.toResponse(user);
    }

    @Transactional
    public UserResponse changeStatus(Long id, UserStatus status, AuthUser actor) {
        if (actor.id().equals(id)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Không thể tự đổi trạng thái tài khoản của chính mình.");
        }
        AppUser user = find(id);
        user.setStatus(status);
        if (status == UserStatus.ACTIVE) {
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
        } else {
            refreshTokens.revokeAllForUser(id, "USER_" + status.name());
        }
        users.saveAndFlush(user);
        return mapper.toResponse(user);
    }

    @Transactional
    public UserRequests.TemporaryPassword resetPassword(Long id, AuthUser actor) {
        if (actor.id().equals(id)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Hãy dùng chức năng Đổi mật khẩu cho tài khoản của bạn.");
        }
        AppUser user = find(id);
        String temporaryPassword = passwordGenerator.generate();
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setPasswordChangedAt(OffsetDateTime.now(clock));
        user.setMustChangePassword(true);
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        refreshTokens.revokeAllForUser(id, "PASSWORD_RESET_BY_ADMIN");
        users.saveAndFlush(user);
        return new UserRequests.TemporaryPassword(temporaryPassword);
    }

    /**
     * Người không phải Admin hệ thống chỉ quản lý người dùng cùng ít nhất một tòa (không gồm Admin hệ thống) — tránh
     * xem / sửa tài khoản tòa khác.
     */
    private AppUser find(Long id) {
        AuthUser actor = CurrentUser.get();
        return users.findById(id)
                .filter(u -> actor.superAdmin() || u.getId().equals(actor.id())
                        || (!isSuperAdmin(u) && u.getBuildingIds().stream().anyMatch(actor.buildingIds()::contains)))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng."));
    }

    private Specification<AppUser> manageableScope() {
        AuthUser actor = CurrentUser.get();
        if (actor.superAdmin()) {
            return null;
        }
        return (root, query, cb) -> {
            if (actor.buildingIds().isEmpty()) {
                return cb.equal(root.get("id"), actor.id());
            }
            var shared = query.subquery(Long.class);
            var u = shared.from(AppUser.class);
            shared.select(u.get("id")).where(cb.equal(u.get("id"), root.get("id")),
                    u.join("buildingIds").in(actor.buildingIds()));
            var admin = query.subquery(Long.class);
            var a = admin.from(AppUser.class);
            admin.select(a.get("id")).where(cb.equal(a.get("id"), root.get("id")),
                    cb.equal(a.join("roles").get("code"), AuthUser.SUPER_ADMIN));
            return cb.or(cb.equal(root.get("id"), actor.id()), cb.and(cb.exists(shared), cb.not(cb.exists(admin))));
        };
    }

    private static boolean isSuperAdmin(AppUser u) {
        return u.getRoles().stream().anyMatch(r -> AuthUser.SUPER_ADMIN.equals(r.getCode()));
    }

    /** Người không phải Admin hệ thống chỉ gán được tòa mình phụ trách. */
    private Set<Long> requireOwnBuildings(Set<Long> ids) {
        AuthUser actor = CurrentUser.get();
        if (!actor.superAdmin() && !actor.buildingIds().containsAll(ids)) {
            throw BusinessException.field(ErrorCode.FORBIDDEN, "buildingIds", "Chỉ gán được tòa nhà bạn đang phụ trách.");
        }
        return ids;
    }

    private Set<Role> resolveRoles(Set<String> roleCodes) {
        Set<String> codes = roleCodes.stream().map(c -> c.trim().toUpperCase(Locale.ROOT)).collect(Collectors.toSet());
        List<Role> found = roles.findByCodeIn(codes);
        if (found.size() != codes.size()) {
            Set<String> foundCodes = found.stream().map(Role::getCode).collect(Collectors.toSet());
            String missing = codes.stream().filter(c -> !foundCodes.contains(c)).sorted().collect(Collectors.joining(", "));
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "roleCodes", "Vai trò không hợp lệ: " + missing);
        }
        // Không gán được Admin hệ thống hay vai trò có quyền vượt quá quyền của chính người thao tác.
        AuthUser actor = CurrentUser.get();
        if (!actor.superAdmin()) {
            for (Role r : found) {
                boolean exceeds = AuthUser.SUPER_ADMIN.equals(r.getCode())
                        || r.getPermissions().stream().anyMatch(p -> !actor.permissions().contains(p.getCode()));
                if (exceeds) {
                    throw BusinessException.field(ErrorCode.FORBIDDEN, "roleCodes",
                            "Không được gán vai trò \"" + r.getName() + "\" có quyền vượt quá quyền của bạn.");
                }
            }
        }
        return new HashSet<>(found);
    }

    private Set<Long> resolveBuildings(Set<Long> buildingIds) {
        if (buildingIds == null || buildingIds.isEmpty()) {
            return new HashSet<>();
        }
        Set<Long> found = new HashSet<>(buildings.findExistingIds(buildingIds));
        if (found.size() != buildingIds.size()) {
            String missing = buildingIds.stream().filter(b -> !found.contains(b)).sorted().map(String::valueOf)
                    .collect(Collectors.joining(", "));
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "buildingIds", "Tòa nhà không tồn tại: " + missing);
        }
        return found;
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
