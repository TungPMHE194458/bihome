package com.bihome.building;

import com.bihome.building.dto.BuildingDtos;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.ImageListResolver;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.user.AppUserRepository;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Màn hình Tòa nhà không lọc theo tòa đang chọn ở header (X-Building-Id), nhưng user không phải Admin hệ thống
 * chỉ thấy các tòa được gán; tòa ngoài phạm vi trả 404 để không lộ sự tồn tại.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BuildingService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Set<String> SORTABLE = Set.of("code", "name", "apartmentCount", "createdAt", "updatedAt");

    private final BuildingRepository buildings;
    private final ImageListResolver imageResolver;
    private final AppUserRepository users;
    private final BuildingMapper mapper;
    private final BuildingContext buildingContext;

    public PageResponse<BuildingDtos.Summary> list(BuildingDtos.Filter filter, PageParams pageParams) {
        return PageResponse.of(
                buildings.findAll(BuildingSpecifications.of(filter, buildingContext.accessibleBuildingIds()),
                        pageParams.toPageable(DEFAULT_SORT, SORTABLE)),
                mapper::toSummary);
    }

    /** Admin hệ thống thấy mọi tòa (kể cả ngừng hoạt động); người khác chỉ thấy tòa được gán đang hoạt động. */
    public List<BuildingDtos.Option> options() {
        List<Building> result = buildingContext.accessibleBuildingIds()
                .map(ids -> ids.isEmpty() ? List.<Building>of()
                        : buildings.findByIdInAndStatusOrderByNameAsc(ids, ActiveStatus.ACTIVE))
                .orElseGet(buildings::findAllByOrderByNameAsc);
        return result.stream().map(mapper::toOption).toList();
    }

    public BuildingDtos.Response get(Long id) {
        return toResponse(findAccessible(id));
    }

    private BuildingDtos.Response toResponse(Building building) {
        return mapper.toResponse(building, buildings.countResidents(building.getId()),
                buildings.countOccupiedApartments(building.getId()));
    }

    /** Dùng cho module khác (vd Căn hộ): tòa phải tồn tại và nằm trong phạm vi của user, nếu không → 404. */
    public Building findAccessible(Long id) {
        boolean allowed = buildingContext.accessibleBuildingIds().map(ids -> ids.contains(id)).orElse(true);
        return buildings.findById(id).filter(b -> allowed)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tòa nhà."));
    }

    /** Tòa phải truy cập được và đang hoạt động (dùng trước khi thêm dữ liệu building-scoped). */
    public Building requireActive(Long id, String message) {
        Building building = findAccessible(id);
        if (building.getStatus() != ActiveStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, message);
        }
        return building;
    }

    /**
     * Phạm vi tòa cho danh sách của module building-scoped: tòa chỉ định trong filter (phải truy cập được)
     * → tòa đang chọn ở header → mọi tòa được truy cập. Rỗng = không giới hạn (Admin ở chế độ "Tất cả").
     */
    public Optional<Set<Long>> listScope(Long explicitBuildingId) {
        if (explicitBuildingId != null) {
            findAccessible(explicitBuildingId);
            return Optional.of(Set.of(explicitBuildingId));
        }
        Optional<Long> selected = buildingContext.selectedBuildingId();
        if (selected.isPresent()) {
            return Optional.of(Set.of(selected.get()));
        }
        return buildingContext.accessibleBuildingIds();
    }

    /** Bản ghi building-scoped có xem được không (theo các tòa user được gán, không theo tòa đang chọn). */
    public boolean canAccess(Long buildingId) {
        return buildingContext.accessibleBuildingIds().map(ids -> ids.contains(buildingId)).orElse(true);
    }

    @Transactional
    public BuildingDtos.Response create(BuildingDtos.Request req, AuthUser actor) {
        String code = normalizeCode(req.code());
        if (buildings.existsByCode(code)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã tòa nhà đã tồn tại.");
        }
        Building building = new Building();
        building.setCode(code);
        apply(building, req, actor);
        buildings.saveAndFlush(building);

        // Người tạo không phải Admin hệ thống được gán ngay vào tòa mới, nếu không sẽ không thấy tòa mình vừa tạo.
        if (!actor.superAdmin()) {
            users.findById(actor.id()).ifPresent(u -> u.getBuildingIds().add(building.getId()));
        }
        return toResponse(building);
    }

    @Transactional
    public BuildingDtos.Response update(Long id, BuildingDtos.Request req, AuthUser actor) {
        Building building = findAccessible(id);
        if (req.version() == null || !Objects.equals(building.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        String code = normalizeCode(req.code());
        if (buildings.existsByCodeAndIdNot(code, id)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã tòa nhà đã tồn tại.");
        }
        building.setCode(code);
        apply(building, req, actor);
        buildings.saveAndFlush(building);
        return toResponse(building);
    }

    @Transactional
    public BuildingDtos.Response changeStatus(Long id, ActiveStatus status) {
        Building building = findAccessible(id);
        building.setStatus(status);
        buildings.saveAndFlush(building);
        return toResponse(building);
    }

    /** Chặn xoá khi còn căn hộ; gỡ quyền truy cập của user vào tòa. Tệp ảnh giữ lại cho job dọn tệp mồ côi. */
    @Transactional
    public void delete(Long id) {
        Building building = findAccessible(id);
        if (building.getApartmentCount() > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "Tòa nhà còn " + building.getApartmentCount()
                    + " căn hộ, hãy chuyển sang Không hoạt động.");
        }
        buildings.deleteUserAssignments(id);
        buildings.delete(building);
    }

    private void apply(Building building, BuildingDtos.Request req, AuthUser actor) {
        building.setName(req.name().trim());
        building.setProvince(req.province().trim());
        building.setWard(req.ward().trim());
        building.setAddressDetail(req.addressDetail().trim());
        building.setType(req.type());
        building.setFloorsAbove(req.floorsAbove());
        building.setFloorsBelow(req.floorsBelow());
        building.setInvestor(trimToNull(req.investor()));
        building.setHotline(trimToNull(req.hotline()));
        String email = trimToNull(req.managementEmail());
        building.setManagementEmail(email == null ? null : email.toLowerCase(Locale.ROOT));
        building.setDescription(trimToNull(req.description()));
        building.setStatus(req.status());
        building.setImages(imageResolver.resolve(req.images(), building.getImages(), FilePurpose.BUILDING_IMAGE, actor));
    }

    static String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
