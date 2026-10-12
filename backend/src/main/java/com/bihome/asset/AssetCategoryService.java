package com.bihome.asset;

import com.bihome.asset.dto.AssetDtos;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Danh mục tài sản theo tòa nhà; tên duy nhất trong tòa (không phân biệt hoa thường). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssetCategoryService {

    private static final Sort DEFAULT_SORT = Sort.by("name");
    private static final Set<String> SORTABLE = Set.of("name", "unit", "createdAt", "updatedAt");

    private final AssetCategoryRepository categories;
    private final AssetItemRepository items;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final AssetMapper mapper;
    private final EntityManager entityManager;

    public PageResponse<AssetDtos.CategoryResponse> list(AssetDtos.CategoryFilter filter, PageParams pageParams) {
        return PageResponse.of(categories.findAll(
                        AssetSpecifications.categories(filter, buildingService.listScope(filter.buildingId())),
                        pageParams.toPageable(DEFAULT_SORT, SORTABLE)),
                mapper::toResponse);
    }

    /** Danh mục đang hoạt động của một tòa (mặc định tòa đang chọn) cho ô chọn ở form hạng mục. */
    /** Danh mục đang hoạt động của một tòa; không chọn tòa ("Tất cả") thì của mọi tòa được truy cập. */
    public List<AssetDtos.CategoryOption> options(Long buildingId) {
        Long id = buildingId != null ? buildingId : buildingContext.selectedBuildingId().orElse(null);
        if (id == null) {
            Optional<Set<Long>> scope = buildingService.listScope(null);
            return categories.findAll(Sort.by("name")).stream()
                    .filter(c -> c.getStatus() == ActiveStatus.ACTIVE)
                    .filter(c -> scope.map(ids -> ids.contains(c.getBuildingId())).orElse(true))
                    .map(mapper::toOption).toList();
        }
        buildingService.findAccessible(id);
        return categories.findByBuildingIdAndStatusOrderByNameAsc(id, ActiveStatus.ACTIVE).stream()
                .map(mapper::toOption).toList();
    }

    public AssetDtos.CategoryResponse get(Long id) {
        return mapper.toResponse(requireAccessible(id));
    }

    @Transactional
    public AssetDtos.CategoryResponse create(AssetDtos.CategoryRequest req) {
        Long buildingId = req.buildingId() != null ? req.buildingId() : buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm danh mục.");
        String name = req.name().trim();
        if (categories.existsByBuildingIdAndNameIgnoreCase(buildingId, name)) {
            throw duplicateName();
        }
        AssetCategory category = new AssetCategory();
        category.setBuildingId(buildingId);
        apply(category, req);
        categories.saveAndFlush(category);
        entityManager.refresh(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public AssetDtos.CategoryResponse update(Long id, AssetDtos.CategoryRequest req) {
        AssetCategory category = requireAccessible(id);
        if (req.version() == null || !Objects.equals(category.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (categories.existsByBuildingIdAndNameIgnoreCaseAndIdNot(category.getBuildingId(), req.name().trim(), id)) {
            throw duplicateName();
        }
        apply(category, req);
        categories.saveAndFlush(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public AssetDtos.CategoryResponse changeStatus(Long id, ActiveStatus status) {
        AssetCategory category = requireAccessible(id);
        category.setStatus(status);
        categories.saveAndFlush(category);
        return mapper.toResponse(category);
    }

    /** Danh mục đang có hạng mục thì chỉ cho chuyển Ngừng hoạt động, không cho xoá. */
    @Transactional
    public void delete(Long id) {
        AssetCategory category = requireAccessible(id);
        long count = items.countByCategoryId(id);
        if (count > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Danh mục đang có " + count + " hạng mục, hãy chuyển sang Ngừng hoạt động.");
        }
        categories.delete(category);
    }

    AssetCategory requireAccessible(Long id) {
        return categories.findById(id)
                .filter(c -> buildingService.canAccess(c.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy danh mục."));
    }

    private static void apply(AssetCategory category, AssetDtos.CategoryRequest req) {
        category.setName(req.name().trim());
        category.setUnit(req.unit().trim());
        category.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        category.setStatus(req.status());
    }

    private static BusinessException duplicateName() {
        return BusinessException.field(ErrorCode.CONFLICT, "name", "Tên danh mục đã tồn tại trong tòa nhà này.");
    }
}
