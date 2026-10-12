package com.bihome.voucher;

import com.bihome.amenity.Amenity;
import com.bihome.amenity.AmenityRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.util.AppTime;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.servicecatalog.ServiceOffering;
import com.bihome.servicecatalog.ServiceOfferingRepository;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.Voucher.DiscountType;
import com.bihome.voucher.Voucher.Validity;
import com.bihome.voucher.dto.VoucherDtos;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.LinkedHashSet;
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

/**
 * Voucher theo tòa nhà; mã duy nhất toàn hệ thống. Đã có lượt dùng thì không sửa loại / giá trị giảm / phạm vi,
 * không giảm tổng số lượng dưới số đã dùng và không xoá được.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoucherService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "name", "name",
            "discountValue", "discountValue",
            "usedCount", "usedCount",
            "validFrom", "validFrom",
            "validTo", "validTo",
            "createdAt", "createdAt");

    private final VoucherRepository vouchers;
    private final AmenityRepository amenities;
    private final ServiceOfferingRepository services;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<VoucherDtos.Response> list(VoucherDtos.Filter filter, PageParams pageParams) {
        LocalDate today = today();
        return PageResponse.of(vouchers.findAll(spec(filter, today), pageParams.toPageable(DEFAULT_SORT, SORTS)),
                v -> toResponse(v, today));
    }

    public VoucherDtos.Response get(Long id) {
        return toResponse(requireAccessible(id), today());
    }

    @Transactional
    public VoucherDtos.Response create(VoucherDtos.Request req) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm voucher.");
        Voucher voucher = new Voucher();
        voucher.setBuildingId(buildingId);
        voucher.setCode(requireUniqueCode(req.code(), null));
        apply(voucher, req);
        vouchers.saveAndFlush(voucher);
        entityManager.refresh(voucher);
        return toResponse(voucher, today());
    }

    @Transactional
    public VoucherDtos.Response update(Long id, VoucherDtos.Request req) {
        Voucher voucher = requireAccessible(id);
        if (req.version() == null || !Objects.equals(voucher.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (voucher.getUsedCount() > 0) {
            boolean valueChanged = voucher.getDiscountType() != req.discountType()
                    || voucher.getDiscountValue().compareTo(req.discountValue()) != 0
                    || !sameAmount(voucher.getMaxDiscount(), req.maxDiscount())
                    || voucher.getApplyScope() != req.applyScope()
                    || !voucher.getAmenityIds().equals(new LinkedHashSet<>(orEmpty(req.amenityIds())))
                    || !voucher.getServiceIds().equals(new LinkedHashSet<>(orEmpty(req.serviceIds())));
            if (valueChanged) {
                throw BusinessException.field(ErrorCode.CONFLICT, "discountValue",
                        "Voucher đã có " + voucher.getUsedCount()
                                + " lượt dùng, không sửa được loại / giá trị giảm, phạm vi và tiện ích / dịch vụ áp dụng.");
            }
            if (!voucher.getCode().equals(normalize(req.code()))) {
                throw BusinessException.field(ErrorCode.CONFLICT, "code", "Voucher đã có lượt dùng, không đổi được mã.");
            }
        }
        if (req.totalQuantity() != null && req.totalQuantity() < voucher.getUsedCount()) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "totalQuantity",
                    "Tổng số lượng không được nhỏ hơn số lượt đã dùng (" + voucher.getUsedCount() + ").");
        }
        voucher.setCode(requireUniqueCode(req.code(), id));
        apply(voucher, req);
        vouchers.saveAndFlush(voucher);
        return toResponse(voucher, today());
    }

    @Transactional
    public VoucherDtos.Response changeStatus(Long id, ActiveStatus status) {
        Voucher voucher = requireAccessible(id);
        voucher.setStatus(status);
        vouchers.saveAndFlush(voucher);
        return toResponse(voucher, today());
    }

    /** Voucher đã có lượt dùng thì chỉ chuyển Ngừng hoạt động, không xoá. */
    @Transactional
    public void delete(Long id) {
        Voucher voucher = requireAccessible(id);
        if (voucher.getUsedCount() > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Voucher đã có " + voucher.getUsedCount() + " lượt dùng, hãy chuyển sang Ngừng hoạt động.");
        }
        vouchers.delete(voucher);
    }

    // ---------------------------------------------------------------- Helpers

    Voucher requireAccessible(Long id) {
        return vouchers.findById(id)
                .filter(v -> buildingService.canAccess(v.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy voucher."));
    }

    private void apply(Voucher voucher, VoucherDtos.Request req) {
        if (req.discountType() == DiscountType.PERCENT && req.discountValue().compareTo(HUNDRED) > 0) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "discountValue", "Giảm theo % tối đa 100%.");
        }
        if (req.discountType() == DiscountType.AMOUNT && req.discountValue().stripTrailingZeros().scale() > 0) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "discountValue", "Số tiền giảm là số nguyên (VND).");
        }
        if (req.discountType() == DiscountType.AMOUNT && req.maxDiscount() != null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "maxDiscount",
                    "Giảm tối đa chỉ dùng với voucher giảm theo %.");
        }
        if (req.validTo().isBefore(req.validFrom())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "validTo", "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }
        if (req.totalQuantity() != null && req.perApartmentLimit() != null && req.perApartmentLimit() > req.totalQuantity()) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "perApartmentLimit",
                    "Giới hạn mỗi căn hộ không được lớn hơn tổng số lượng.");
        }
        voucher.setName(req.name().trim());
        voucher.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        voucher.setDiscountType(req.discountType());
        voucher.setDiscountValue(req.discountValue());
        voucher.setMaxDiscount(req.maxDiscount());
        voucher.setApplyScope(req.applyScope());
        voucher.setAmenityIds(resolveAmenities(voucher, req));
        voucher.setServiceIds(resolveServices(voucher, req));
        voucher.setTotalQuantity(req.totalQuantity());
        voucher.setPerApartmentLimit(req.perApartmentLimit());
        voucher.setValidFrom(req.validFrom());
        voucher.setValidTo(req.validTo());
        voucher.setStatus(req.status());
    }

    /** Tiện ích cụ thể phải cùng tòa; phạm vi Dịch vụ thì không được chọn tiện ích. */
    private Set<Long> resolveAmenities(Voucher voucher, VoucherDtos.Request req) {
        List<Long> ids = orEmpty(req.amenityIds());
        if (ids.isEmpty()) {
            return new LinkedHashSet<>();
        }
        if (req.applyScope() == ApplyScope.SERVICE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "amenityIds",
                    "Voucher áp dụng cho dịch vụ không chọn được tiện ích.");
        }
        List<Amenity> found = amenities.findByIdIn(ids);
        boolean valid = found.size() == new LinkedHashSet<>(ids).size()
                && found.stream().allMatch(a -> a.getBuildingId().equals(voucher.getBuildingId())
                && (a.getStatus() == ActiveStatus.ACTIVE || voucher.getAmenityIds().contains(a.getId())));
        if (!valid) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "amenityIds",
                    "Tiện ích phải thuộc tòa của voucher và đang hoạt động.");
        }
        return new LinkedHashSet<>(ids);
    }

    private Set<Long> resolveServices(Voucher voucher, VoucherDtos.Request req) {
        List<Long> ids = orEmpty(req.serviceIds());
        if (ids.isEmpty()) {
            return new LinkedHashSet<>();
        }
        if (req.applyScope() == ApplyScope.AMENITY) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "serviceIds",
                    "Voucher áp dụng cho tiện ích không chọn được dịch vụ.");
        }
        List<ServiceOffering> found = services.findByIdIn(ids);
        boolean valid = found.size() == new LinkedHashSet<>(ids).size()
                && found.stream().allMatch(s -> s.getBuildingId().equals(voucher.getBuildingId())
                && (s.getStatus() == ActiveStatus.ACTIVE || voucher.getServiceIds().contains(s.getId())));
        if (!valid) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "serviceIds",
                    "Dịch vụ phải thuộc tòa của voucher và đang hoạt động.");
        }
        return new LinkedHashSet<>(ids);
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }

    private List<VoucherDtos.Target> amenityTargets(Collection<Long> ids) {
        return ids.isEmpty() ? List.of() : amenities.findByIdIn(ids).stream()
                .map(a -> new VoucherDtos.Target(a.getId(), a.getCode(), a.getName())).toList();
    }

    private List<VoucherDtos.Target> serviceTargets(Collection<Long> ids) {
        return ids.isEmpty() ? List.of() : services.findByIdIn(ids).stream()
                .map(s -> new VoucherDtos.Target(s.getId(), s.getCode(), s.getName())).toList();
    }

    private String requireUniqueCode(String requested, Long excludeId) {
        String code = normalize(requested);
        boolean taken = excludeId == null ? vouchers.existsByCode(code) : vouchers.existsByCodeAndIdNot(code, excludeId);
        if (taken) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã voucher đã tồn tại.");
        }
        return code;
    }

    private static String normalize(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private static boolean sameAmount(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    private VoucherDtos.Response toResponse(Voucher v, LocalDate today) {
        Integer remaining = v.getTotalQuantity() == null ? null : Math.max(0, v.getTotalQuantity() - v.getUsedCount());
        return new VoucherDtos.Response(v.getId(), v.getBuildingId(), v.getBuilding().getName(), v.getCode(), v.getName(),
                v.getDescription(), v.getDiscountType(), v.getDiscountValue(), v.getMaxDiscount(), v.getApplyScope(),
                amenityTargets(v.getAmenityIds()), serviceTargets(v.getServiceIds()), v.getTotalQuantity(), v.getUsedCount(), remaining, v.isSoldOut(), v.getPerApartmentLimit(),
                v.getValidFrom(), v.getValidTo(), v.validity(today), v.getStatus(), v.getUsedCount() > 0,
                v.getCreatedAt(), v.getUpdatedAt(), v.getCreatedBy(), v.getVersion());
    }

    private Specification<Voucher> spec(VoucherDtos.Filter f, LocalDate today) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<Voucher>create()
                .likeAny(f.keyword(), "code", "name")
                .like("code", f.code())
                .like("name", f.name())
                .eq("discountType", f.discountType())
                .eq("applyScope", f.applyScope())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                // Hiệu lực giao với khoảng lọc: validTo >= from và validFrom <= to.
                .and(f.validFrom() == null ? null : (root, q, cb) -> cb.greaterThanOrEqualTo(root.get("validTo"), f.validFrom()))
                .and(f.validTo() == null ? null : (root, q, cb) -> cb.lessThanOrEqualTo(root.get("validFrom"), f.validTo()))
                .and(validity(f.validity(), today))
                .and(scope.map(ids -> (Specification<Voucher>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private static Specification<Voucher> validity(Validity validity, LocalDate today) {
        if (validity == null) {
            return null;
        }
        return (root, q, cb) -> switch (validity) {
            case EXPIRED -> cb.lessThan(root.get("validTo"), today);
            case UPCOMING -> cb.greaterThan(root.get("validFrom"), today);
            case VALID -> cb.and(cb.lessThanOrEqualTo(root.get("validFrom"), today),
                    cb.greaterThanOrEqualTo(root.get("validTo"), today));
        };
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(AppTime.ZONE));
    }
}
