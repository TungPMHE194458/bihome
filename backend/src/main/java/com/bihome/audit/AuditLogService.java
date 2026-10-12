package com.bihome.audit;

import com.bihome.audit.dto.AuditDtos;
import com.bihome.auth.LoginHistory;
import com.bihome.auth.LoginHistoryRepository;
import com.bihome.building.Building;
import com.bihome.building.BuildingRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditLogService {

    /** Thay đổi người dùng, vai trò, cấu hình chung chỉ Admin hệ thống xem được. */
    static final Set<String> ADMIN_MODULES = Set.of("USER", "ROLE", "SETTING");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "occurredAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORT_MAPPING = Map.of(
            "occurredAt", "occurredAt", "actorUsername", "actorUsername", "module", "moduleCode", "action", "action");
    private static final TypeReference<List<AuditChange>> CHANGES = new TypeReference<>() {
    };

    private final AuditLogRepository logs;
    private final LoginHistoryRepository loginHistory;
    private final AppUserRepository users;
    private final BuildingRepository buildings;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final ObjectMapper objectMapper;

    /**
     * Phạm vi: tòa trong filter → tòa đang chọn → "Tất cả" (các tòa được gán; Admin hệ thống: mọi tòa), luôn kèm dữ
     * liệu dùng chung (danh mục, người dùng...). Người không phải Admin hệ thống không thấy người dùng / vai trò / cấu hình.
     */
    public PageResponse<AuditDtos.Response> list(AuditDtos.Filter f, PageParams pageParams) {
        var spec = SpecificationBuilder.<AuditLog>create()
                .and(scope(f.buildingId()))
                .likeAny(f.keyword(), "entityLabel", "actorUsername", "entityId")
                .eq("moduleCode", f.module())
                .eq("entityType", f.entityType())
                .eq("entityId", f.entityId())
                .eq("action", f.action())
                .like("actorUsername", f.actor())
                .dateBetween("occurredAt", f.from(), f.to())
                .build();
        Page<AuditLog> page = logs.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORT_MAPPING));
        Map<Long, String> actorNames = actorNames(page.getContent().stream().map(AuditLog::getActorId).toList());
        Map<Long, String> buildingNames = buildingNames(page.getContent().stream().map(AuditLog::getBuildingId).toList());
        return PageResponse.of(page, log -> toResponse(log, actorNames, buildingNames));
    }

    private Specification<AuditLog> scope(Long explicitBuildingId) {
        boolean superAdmin = buildingContext.accessibleBuildingIds().isEmpty();
        Optional<Long> selected = Optional.ofNullable(explicitBuildingId).or(buildingContext::selectedBuildingId);
        selected.ifPresent(buildingService::findAccessible);
        Optional<Set<Long>> buildings = selected.map(Set::of).or(buildingContext::accessibleBuildingIds);
        if (buildings.isEmpty()) {
            return null;
        }
        Set<Long> ids = buildings.get();
        return (root, query, cb) -> cb.or(
                ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids),
                superAdmin ? cb.isNull(root.get("buildingId"))
                        : cb.and(cb.isNull(root.get("buildingId")), cb.not(root.get("moduleCode").in(ADMIN_MODULES))));
    }

    /** Lịch sử đăng nhập — chỉ Admin hệ thống (quyền USER_READ). */
    public PageResponse<AuditDtos.LoginResponse> logins(AuditDtos.LoginFilter f, PageParams pageParams) {
        if (!CurrentUser.get().superAdmin()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Chỉ Admin hệ thống xem được lịch sử đăng nhập.");
        }
        var spec = SpecificationBuilder.<LoginHistory>create()
                .likeAny(f.keyword(), "loginName", "ipAddress")
                .eq("success", f.success())
                .dateBetween("createdAt", f.from(), f.to())
                .build();
        Page<LoginHistory> page = loginHistory.findAll(spec,
                pageParams.toPageable(Sort.by(Sort.Direction.DESC, "id"), Set.of("createdAt", "loginName")));
        Map<Long, String> names = actorNames(page.getContent().stream().map(LoginHistory::getUserId).toList());
        return PageResponse.of(page, h -> new AuditDtos.LoginResponse(h.getId(), h.getCreatedAt(), h.getUserId(),
                h.getLoginName(), names.get(h.getUserId()), h.isSuccess(), h.getFailureReason(), h.getIpAddress(),
                h.getUserAgent()));
    }

    private AuditDtos.Response toResponse(AuditLog log, Map<Long, String> actorNames, Map<Long, String> buildingNames) {
        return new AuditDtos.Response(log.getId(), log.getOccurredAt(), log.getActorId(), log.getActorUsername(),
                actorNames.get(log.getActorId()), log.getAction(), log.getModuleCode(), log.getEntityType(),
                log.getEntityId(), log.getEntityLabel(), log.getBuildingId(), buildingNames.get(log.getBuildingId()),
                changes(log), log.getIpAddress());
    }

    private List<AuditChange> changes(AuditLog log) {
        if (log.getChanges() == null) {
            return List.of();
        }
        try {
            return objectMapper.readValue(log.getChanges(), CHANGES);
        } catch (Exception ex) {
            AuditLogService.log.warn("Không đọc được chi tiết thay đổi của lịch sử hoạt động #{}", log.getId(), ex);
            return List.of();
        }
    }

    private Map<Long, String> actorNames(Collection<Long> ids) {
        Set<Long> distinct = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (distinct.isEmpty()) {
            return new HashMap<>();
        }
        return users.findWithProfileByIdIn(distinct).stream()
                .filter(u -> u.getProfile() != null)
                .collect(Collectors.toMap(AppUser::getId, u -> u.getProfile().getFullName()));
    }

    private Map<Long, String> buildingNames(Collection<Long> ids) {
        Set<Long> distinct = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        return distinct.isEmpty() ? new HashMap<>()
                : buildings.findAllById(distinct).stream().collect(Collectors.toMap(Building::getId, Building::getName));
    }
}
