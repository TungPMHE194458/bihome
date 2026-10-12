package com.bihome.servicecatalog;

import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.common.storage.ImageListResolver;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.servicecatalog.dto.ServiceDtos;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dịch vụ theo tòa nhà; mã duy nhất trong tòa (bỏ trống = DV + 4 số); loại dịch vụ mới chọn phải đang hoạt động. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceOfferingService {

    private static final Sort DEFAULT_SORT = Sort.by("name");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "name", "name",
            "unitPrice", "unitPrice",
            "serviceTypeName", "serviceType.name",
            "createdAt", "createdAt");

    private final ServiceOfferingRepository services;
    private final ServiceOrderRepository orders;
    private final ServiceTypeService typeService;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final ImageListResolver imageResolver;
    private final FileService fileService;
    private final EntityManager entityManager;

    public PageResponse<ServiceDtos.Response> list(ServiceDtos.Filter f, PageParams pageParams) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        Specification<ServiceOffering> spec = SpecificationBuilder.<ServiceOffering>create()
                .likeAny(f.keyword(), "code", "name", "description")
                .like("code", f.code())
                .like("name", f.name())
                .eq("serviceTypeId", f.serviceTypeId())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<ServiceOffering>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
        return PageResponse.of(services.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORTS)), this::toResponse);
    }

    /** Dịch vụ đang hoạt động của một tòa (mặc định tòa đang chọn) cho ô chọn (voucher, đơn dịch vụ). */
    public List<ServiceDtos.Option> options(Long buildingId) {
        Long id = buildingId != null ? buildingId : buildingContext.requireBuildingId();
        buildingService.findAccessible(id);
        return services.findByBuildingIdAndStatusOrderByNameAsc(id, ActiveStatus.ACTIVE).stream()
                .map(s -> new ServiceDtos.Option(s.getId(), s.getCode(), s.getName(), s.getUnitPrice(), s.getUnit(),
                        s.getBuildingId()))
                .toList();
    }

    public ServiceDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    @Transactional
    public ServiceDtos.Response create(ServiceDtos.Request req, AuthUser actor) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm dịch vụ.");
        ServiceOffering service = new ServiceOffering();
        service.setBuildingId(buildingId);
        service.setCode(resolveCode(buildingId, req.code(), null));
        apply(service, req, actor);
        services.saveAndFlush(service);
        entityManager.refresh(service);
        return toResponse(service);
    }

    @Transactional
    public ServiceDtos.Response update(Long id, ServiceDtos.Request req, AuthUser actor) {
        ServiceOffering service = requireAccessible(id);
        if (req.version() == null || !Objects.equals(service.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        service.setCode(resolveCode(service.getBuildingId(), req.code(), service));
        apply(service, req, actor);
        services.saveAndFlush(service);
        entityManager.refresh(service);
        return toResponse(service);
    }

    @Transactional
    public ServiceDtos.Response changeStatus(Long id, ActiveStatus status) {
        ServiceOffering service = requireAccessible(id);
        service.setStatus(status);
        services.saveAndFlush(service);
        return toResponse(service);
    }

    @Transactional
    public void delete(Long id) {
        ServiceOffering service = requireAccessible(id);
        long vouchers = services.countVoucherTargets(id);
        if (vouchers > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Dịch vụ đang được chỉ định trong " + vouchers + " voucher, hãy chuyển sang Ngừng hoạt động.");
        }
        long orderCount = orders.countByServiceId(id);
        if (orderCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Dịch vụ đã có " + orderCount + " đơn, hãy chuyển sang Ngừng hoạt động.");
        }
        services.delete(service);
    }

    public ServiceOffering requireAccessible(Long id) {
        return services.findById(id)
                .filter(s -> buildingService.canAccess(s.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy dịch vụ."));
    }

    private void apply(ServiceOffering service, ServiceDtos.Request req, AuthUser actor) {
        if (!req.serviceTypeId().equals(service.getServiceTypeId())) {
            ServiceType type = typeService.require(req.serviceTypeId());
            if (type.getStatus() != ActiveStatus.ACTIVE) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "serviceTypeId", "Loại dịch vụ đang ngừng hoạt động.");
            }
            service.setServiceTypeId(type.getId());
        }
        service.setName(req.name().trim());
        service.setUnitPrice(req.unitPrice());
        service.setUnit(req.unit().trim());
        service.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        service.setStatus(req.status());
        service.setImages(imageResolver.resolve(req.images(), service.getImages(), FilePurpose.SERVICE_IMAGE, actor));
    }

    private String resolveCode(Long buildingId, String requested, ServiceOffering existing) {
        String code = requested == null ? "" : requested.trim().toUpperCase(Locale.ROOT);
        if (code.isEmpty()) {
            if (existing != null) {
                return existing.getCode();
            }
            long next = Optional.ofNullable(services.findMaxGeneratedNumber(buildingId)).orElse(0L) + 1;
            return "DV" + "%04d".formatted(next);
        }
        boolean taken = existing == null
                ? services.existsByBuildingIdAndCode(buildingId, code)
                : services.existsByBuildingIdAndCodeAndIdNot(buildingId, code, existing.getId());
        if (taken) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã dịch vụ đã tồn tại trong tòa nhà này.");
        }
        return code;
    }

    private ServiceDtos.Response toResponse(ServiceOffering s) {
        return new ServiceDtos.Response(s.getId(), s.getBuildingId(), s.getBuilding().getName(), s.getCode(), s.getName(),
                s.getServiceTypeId(), s.getServiceType().getName(), s.getUnitPrice(), s.getUnit(), s.getDescription(),
                s.getStatus(), s.getImages().stream().map(fileService::toImageResponse).toList(),
                s.coverFileId().map(fileService::urlFor).orElse(null), s.getCreatedAt(), s.getUpdatedAt(),
                s.getCreatedBy(), s.getVersion());
    }
}
