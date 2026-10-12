package com.bihome.asset;

import com.bihome.accesscard.AccessCardRepository;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.asset.dto.AssetDtos;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hạng mục kê khai của căn hộ (xe...). Quy tắc:
 * danh mục phải cùng tòa và đang hoạt động; ngày ra ≥ ngày vào; có ngày ra ≤ hôm nay → tự chuyển Không hoạt động;
 * biển số duy nhất trong tòa trong số hạng mục đang hoạt động.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AssetItemService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "name", "name",
            "plateNumber", "plateNumber",
            "entryDate", "entryDate",
            "exitDate", "exitDate",
            "apartment", "apartment.name",
            "createdAt", "createdAt");

    private final AssetItemRepository items;
    private final AssetCategoryRepository categories;
    private final ApartmentService apartmentService;
    private final BuildingService buildingService;
    private final AssetMapper mapper;
    private final AccessCardRepository accessCards;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<AssetDtos.ItemResponse> list(AssetDtos.ItemFilter filter, PageParams pageParams) {
        return PageResponse.of(items.findAll(
                        AssetSpecifications.items(filter, buildingService.listScope(filter.buildingId())),
                        pageParams.toPageable(DEFAULT_SORT, SORTS)),
                mapper::toResponse);
    }

    public AssetDtos.ItemResponse get(Long id) {
        return mapper.toResponse(requireAccessible(id));
    }

    @Transactional
    public AssetDtos.ItemResponse create(AssetDtos.ItemRequest req) {
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        buildingService.requireActive(apartment.getBuildingId(),
                "Tòa nhà đang không hoạt động, không thể thêm hạng mục.");
        AssetItem item = new AssetItem();
        item.setBuildingId(apartment.getBuildingId());
        apply(item, req, apartment);
        items.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }

    @Transactional
    public AssetDtos.ItemResponse update(Long id, AssetDtos.ItemRequest req) {
        AssetItem item = requireAccessible(id);
        if (req.version() == null || !Objects.equals(item.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        if (!apartment.getBuildingId().equals(item.getBuildingId())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId",
                    "Chỉ chuyển được sang căn hộ cùng tòa nhà.");
        }
        apply(item, req, apartment);
        items.saveAndFlush(item);
        entityManager.refresh(item);
        return mapper.toResponse(item);
    }

    @Transactional
    public AssetDtos.ItemResponse changeStatus(Long id, ActiveStatus status) {
        AssetItem item = requireAccessible(id);
        if (status == ActiveStatus.ACTIVE) {
            if (hasExited(item.getExitDate())) {
                throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                        "Hạng mục đã có ngày ra, hãy xoá hoặc đổi ngày ra trước khi kích hoạt.");
            }
            requireUniquePlate(item.getBuildingId(), item.getPlateNumber(), item.getId());
        }
        item.setStatus(status);
        items.saveAndFlush(item);
        return mapper.toResponse(item);
    }

    @Transactional
    public void delete(Long id) {
        AssetItem item = requireAccessible(id);
        long cardCount = accessCards.countByAssetItemId(id);
        if (cardCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Hạng mục đang liên kết với " + cardCount + " thẻ từ, hãy thu hồi thẻ hoặc chuyển Ngừng hoạt động.");
        }
        items.delete(item);
    }

    /** Job hằng ngày gọi. @return số hạng mục vừa chuyển Không hoạt động. */
    @Transactional
    public int deactivateExited() {
        return items.deactivateExited(today(), OffsetDateTime.now(clock), ActiveStatus.ACTIVE, ActiveStatus.INACTIVE);
    }

    private void apply(AssetItem item, AssetDtos.ItemRequest req, Apartment apartment) {
        AssetCategory category = categories.findById(req.categoryId())
                .filter(c -> c.getBuildingId().equals(apartment.getBuildingId()))
                .orElseThrow(() -> BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId",
                        "Danh mục không thuộc tòa nhà của căn hộ."));
        boolean categoryChanged = !category.getId().equals(item.getCategoryId());
        if (categoryChanged && category.getStatus() != ActiveStatus.ACTIVE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId", "Danh mục đang ngừng hoạt động.");
        }
        if (req.exitDate() != null && req.exitDate().isBefore(req.entryDate())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "exitDate", "Ngày ra phải sau hoặc bằng ngày vào.");
        }
        ActiveStatus status = hasExited(req.exitDate()) ? ActiveStatus.INACTIVE : req.status();
        String plate = PlateNumbers.normalize(req.plateNumber());
        if (status == ActiveStatus.ACTIVE) {
            requireUniquePlate(apartment.getBuildingId(), plate, item.getId());
        }

        item.setApartmentId(apartment.getId());
        item.setCategoryId(category.getId());
        item.setName(req.name().trim());
        item.setPlateNumber(plate);
        item.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        item.setUnit(req.unit() == null || req.unit().isBlank() ? category.getUnit() : req.unit().trim());
        item.setEntryDate(req.entryDate());
        item.setExitDate(req.exitDate());
        item.setStatus(status);
    }

    private void requireUniquePlate(Long buildingId, String plate, Long excludeId) {
        if (plate != null && items.existsActivePlate(buildingId, plate, ActiveStatus.ACTIVE, excludeId)) {
            throw BusinessException.field(ErrorCode.CONFLICT, "plateNumber",
                    "Số hiệu đã được đăng ký cho một hạng mục đang hoạt động khác trong tòa nhà.");
        }
    }

    private boolean hasExited(LocalDate exitDate) {
        return exitDate != null && !exitDate.isAfter(today());
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    private AssetItem requireAccessible(Long id) {
        return items.findById(id)
                .filter(i -> buildingService.canAccess(i.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy hạng mục."));
    }
}
