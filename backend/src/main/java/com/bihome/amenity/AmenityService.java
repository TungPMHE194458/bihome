package com.bihome.amenity;

import com.bihome.booking.AmenityBookingRepository;
import com.bihome.amenity.dto.AmenityDtos;
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
import com.bihome.amenity.AmenityConfig.Maintenance;
import com.bihome.amenity.AmenityConfig.Price;
import com.bihome.amenity.AmenityConfig.Slot;
import jakarta.persistence.EntityManager;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
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
 * Tiện ích theo tòa nhà + cấu hình đặt chỗ. Mã duy nhất toàn hệ thống. Khung giờ phải nằm trong giờ mở cửa,
 * không chồng nhau trong cùng thứ; mức giá không chồng nhau trong cùng loại ngày.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AmenityService {

    private static final Sort DEFAULT_SORT = Sort.by("name");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "name", "name",
            "capacity", "capacity",
            "slotCount", "slotCount",
            "createdAt", "createdAt");
    private static final String[] DAY_LABELS = {"", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"};

    private final AmenityRepository amenities;
    private final AmenityConfigRepository configs;
    private final AmenityBookingRepository bookings;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final ImageListResolver imageResolver;
    private final FileService fileService;
    private final EntityManager entityManager;

    public PageResponse<AmenityDtos.Response> list(AmenityDtos.Filter filter, PageParams pageParams) {
        return PageResponse.of(amenities.findAll(spec(filter), pageParams.toPageable(DEFAULT_SORT, SORTS)), this::toResponse);
    }

    /** Tiện ích đang hoạt động của một tòa (mặc định tòa đang chọn) cho ô chọn (voucher, đặt chỗ). */
    public List<AmenityDtos.Option> options(Long buildingId) {
        Long id = buildingId != null ? buildingId : buildingContext.requireBuildingId();
        buildingService.findAccessible(id);
        return amenities.findByBuildingIdAndStatusOrderByNameAsc(id, ActiveStatus.ACTIVE).stream()
                .map(a -> new AmenityDtos.Option(a.getId(), a.getCode(), a.getName(), a.getBuildingId(), a.getStatus()))
                .toList();
    }

    public AmenityDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    @Transactional
    public AmenityDtos.Response create(AmenityDtos.Request req, AuthUser actor) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm tiện ích.");
        Amenity amenity = new Amenity();
        amenity.setBuildingId(buildingId);
        amenity.setCode(requireUniqueCode(req.code(), null));
        apply(amenity, req, actor);
        amenities.saveAndFlush(amenity);
        AmenityConfig config = new AmenityConfig();
        config.setAmenityId(amenity.getId());
        configs.saveAndFlush(config);
        entityManager.refresh(amenity);
        return toResponse(amenity);
    }

    @Transactional
    public AmenityDtos.Response update(Long id, AmenityDtos.Request req, AuthUser actor) {
        Amenity amenity = requireAccessible(id);
        if (req.version() == null || !Objects.equals(amenity.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        amenity.setCode(requireUniqueCode(req.code(), id));
        apply(amenity, req, actor);
        // Giờ mở cửa thu hẹp thì khung giờ đã cấu hình phải còn nằm trong giờ mới.
        configs.findById(id).ifPresent(c -> requireSlotsWithinHours(c.getSlots(), amenity));
        amenities.saveAndFlush(amenity);
        return toResponse(amenity);
    }

    @Transactional
    public AmenityDtos.Response changeStatus(Long id, ActiveStatus status) {
        Amenity amenity = requireAccessible(id);
        amenity.setStatus(status);
        amenities.saveAndFlush(amenity);
        return toResponse(amenity);
    }

    /** Chặn xoá khi voucher còn chỉ định tiện ích (sau này thêm: đã có lượt đặt). */
    @Transactional
    public void delete(Long id) {
        Amenity amenity = requireAccessible(id);
        long vouchers = amenities.countVoucherTargets(id);
        if (vouchers > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Tiện ích đang được chỉ định trong " + vouchers + " voucher, hãy chuyển sang Ngừng hoạt động.");
        }
        long bookingCount = bookings.countByAmenityId(id);
        if (bookingCount > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Tiện ích đã có " + bookingCount + " lượt đăng ký, hãy chuyển sang Ngừng hoạt động.");
        }
        configs.findById(id).ifPresent(c -> {
            configs.delete(c);
            configs.flush();
        });
        amenities.delete(amenity);
    }

    // ---------------------------------------------------------------- Cấu hình

    public AmenityDtos.ConfigResponse getConfig(Long id) {
        Amenity amenity = requireAccessible(id);
        return toConfig(amenity, requireConfig(id));
    }

    @Transactional
    public AmenityDtos.ConfigResponse updateConfig(Long id, AmenityDtos.ConfigRequest req) {
        Amenity amenity = requireAccessible(id);
        AmenityConfig config = requireConfig(id);
        if (!Objects.equals(config.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        List<Slot> slots = toSlots(req.slots(), amenity);
        List<Price> prices = toPrices(req.prices());
        List<Maintenance> maintenances = toMaintenances(req.maintenances());
        config.setSlotMinutes(req.slotMinutes());
        config.setMaxBookingsPerWeek(req.maxBookingsPerWeek());
        config.setMaxAdvanceDays(req.maxAdvanceDays());
        config.setFreeCancelHours(req.freeCancelHours());
        config.setSlots(slots);
        config.setPrices(prices);
        config.setMaintenances(maintenances);
        configs.saveAndFlush(config);
        return toConfig(amenity, config);
    }

    private List<Slot> toSlots(List<AmenityDtos.SlotDto> dtos, Amenity amenity) {
        List<Slot> slots = new ArrayList<>();
        for (AmenityDtos.SlotDto d : dtos == null ? List.<AmenityDtos.SlotDto>of() : dtos) {
            if (!d.endTime().isAfter(d.startTime())) {
                throw invalid("slots", DAY_LABELS[d.dayOfWeek()] + " " + d.startTime() + ": giờ kết thúc phải sau giờ bắt đầu.");
            }
            if (d.capacity() != null && d.capacity() > amenity.getCapacity()) {
                throw invalid("slots", DAY_LABELS[d.dayOfWeek()] + " " + d.startTime()
                        + ": sức chứa khung giờ không được lớn hơn sức chứa tiện ích (" + amenity.getCapacity() + ").");
            }
            slots.add(new Slot(d.dayOfWeek(), d.startTime(), d.endTime(), d.capacity()));
        }
        slots.sort(Comparator.comparingInt(Slot::getDayOfWeek).thenComparing(Slot::getStartTime));
        for (int i = 1; i < slots.size(); i++) {
            Slot prev = slots.get(i - 1);
            Slot cur = slots.get(i);
            if (prev.getDayOfWeek() == cur.getDayOfWeek() && cur.getStartTime().isBefore(prev.getEndTime())) {
                throw invalid("slots", DAY_LABELS[cur.getDayOfWeek()] + ": khung " + prev.getStartTime() + "–"
                        + prev.getEndTime() + " và " + cur.getStartTime() + "–" + cur.getEndTime() + " bị chồng nhau.");
            }
        }
        requireSlotsWithinHours(slots, amenity);
        return slots;
    }

    private static void requireSlotsWithinHours(List<Slot> slots, Amenity amenity) {
        for (Slot s : slots) {
            if (s.getStartTime().isBefore(amenity.getOpenTime()) || s.getEndTime().isAfter(amenity.getCloseTime())) {
                throw invalid("slots", DAY_LABELS[s.getDayOfWeek()] + " " + s.getStartTime() + "–" + s.getEndTime()
                        + " nằm ngoài giờ mở cửa " + amenity.getOpenTime() + "–" + amenity.getCloseTime() + ".");
            }
        }
    }

    private static List<Price> toPrices(List<AmenityDtos.PriceDto> dtos) {
        List<Price> prices = new ArrayList<>();
        for (AmenityDtos.PriceDto d : dtos == null ? List.<AmenityDtos.PriceDto>of() : dtos) {
            if (!d.endTime().isAfter(d.startTime())) {
                throw invalid("prices", "Mức giá " + d.startTime() + ": giờ kết thúc phải sau giờ bắt đầu.");
            }
            prices.add(new Price(d.dayType(), d.startTime(), d.endTime(), d.price(), d.priceUnit()));
        }
        prices.sort(Comparator.comparing(Price::getDayType).thenComparing(Price::getStartTime));
        for (int i = 1; i < prices.size(); i++) {
            Price prev = prices.get(i - 1);
            Price cur = prices.get(i);
            if (prev.getDayType() == cur.getDayType() && cur.getStartTime().isBefore(prev.getEndTime())) {
                throw invalid("prices", (cur.getDayType() == AmenityConfig.DayType.WEEKEND ? "Cuối tuần" : "Ngày thường")
                        + ": mức giá " + prev.getStartTime() + "–" + prev.getEndTime() + " và " + cur.getStartTime() + "–"
                        + cur.getEndTime() + " bị chồng nhau.");
            }
        }
        return prices;
    }

    private static List<Maintenance> toMaintenances(List<AmenityDtos.MaintenanceDto> dtos) {
        List<Maintenance> list = new ArrayList<>();
        for (AmenityDtos.MaintenanceDto d : dtos == null ? List.<AmenityDtos.MaintenanceDto>of() : dtos) {
            if (d.endDate().isBefore(d.startDate())) {
                throw invalid("maintenances", "Đợt bảo trì từ " + d.startDate() + ": ngày kết thúc phải sau ngày bắt đầu.");
            }
            list.add(new Maintenance(d.startDate(), d.endDate(),
                    d.reason() == null || d.reason().isBlank() ? null : d.reason().trim()));
        }
        list.sort(Comparator.comparing(Maintenance::getStartDate));
        for (int i = 1; i < list.size(); i++) {
            if (!list.get(i).getStartDate().isAfter(list.get(i - 1).getEndDate())) {
                throw invalid("maintenances", "Các đợt bảo trì bị chồng nhau (" + list.get(i - 1).getStartDate() + " và "
                        + list.get(i).getStartDate() + ").");
            }
        }
        return list;
    }

    // ---------------------------------------------------------------- Helpers

    /** Tiện ích phải thuộc tòa user được truy cập, nếu không → 404 (dùng cả cho module khác). */
    public Amenity requireAccessible(Long id) {
        return amenities.findById(id)
                .filter(a -> buildingService.canAccess(a.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tiện ích."));
    }

    public AmenityConfig requireConfig(Long amenityId) {
        return configs.findById(amenityId).orElseThrow(() -> new NotFoundException("Tiện ích chưa có cấu hình."));
    }

    private void apply(Amenity amenity, AmenityDtos.Request req, AuthUser actor) {
        if (!req.closeTime().isAfter(req.openTime())) {
            throw invalid("closeTime", "Giờ đóng cửa phải sau giờ mở cửa.");
        }
        amenity.setName(req.name().trim());
        amenity.setLocation(trimToNull(req.location()));
        amenity.setCapacity(req.capacity());
        amenity.setOpenTime(minutes(req.openTime()));
        amenity.setCloseTime(minutes(req.closeTime()));
        amenity.setRules(trimToNull(req.rules()));
        amenity.setRequiresApproval(req.requiresApproval());
        amenity.setStatus(req.status());
        amenity.setImages(imageResolver.resolve(req.images(), amenity.getImages(), FilePurpose.AMENITY_IMAGE, actor));
    }

    private String requireUniqueCode(String requested, Long excludeId) {
        String code = requested.trim().toUpperCase(Locale.ROOT);
        boolean taken = excludeId == null ? amenities.existsByCode(code) : amenities.existsByCodeAndIdNot(code, excludeId);
        if (taken) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã tiện ích đã tồn tại.");
        }
        return code;
    }

    private Specification<Amenity> spec(AmenityDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<Amenity>create()
                .likeAny(f.keyword(), "code", "name", "location")
                .like("code", f.code())
                .like("name", f.name())
                .like("location", f.location())
                .eq("requiresApproval", f.requiresApproval())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<Amenity>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private AmenityDtos.Response toResponse(Amenity a) {
        return new AmenityDtos.Response(a.getId(), a.getBuildingId(), a.getBuilding().getName(), a.getCode(), a.getName(),
                a.getLocation(), a.getCapacity(), a.getOpenTime(), a.getCloseTime(), a.getRules(), a.isRequiresApproval(),
                a.getStatus(), a.getImages().stream().map(fileService::toImageResponse).toList(),
                a.coverFileId().map(fileService::urlFor).orElse(null), a.getSlotCount(), a.getCreatedAt(),
                a.getUpdatedAt(), a.getCreatedBy(), a.getVersion());
    }

    private static AmenityDtos.ConfigResponse toConfig(Amenity a, AmenityConfig c) {
        return new AmenityDtos.ConfigResponse(a.getId(), a.getCode(), a.getName(), a.getCapacity(), a.getOpenTime(),
                a.getCloseTime(), c.getSlotMinutes(), c.getMaxBookingsPerWeek(), c.getMaxAdvanceDays(),
                c.getFreeCancelHours(),
                c.getSlots().stream().sorted(Comparator.comparingInt(Slot::getDayOfWeek).thenComparing(Slot::getStartTime))
                        .map(s -> new AmenityDtos.SlotDto(s.getDayOfWeek(), s.getStartTime(), s.getEndTime(), s.getCapacity()))
                        .toList(),
                c.getPrices().stream().sorted(Comparator.comparing(Price::getDayType).thenComparing(Price::getStartTime))
                        .map(p -> new AmenityDtos.PriceDto(p.getDayType(), p.getStartTime(), p.getEndTime(), p.getPrice(),
                                p.getPriceUnit()))
                        .toList(),
                c.getMaintenances().stream().sorted(Comparator.comparing(Maintenance::getStartDate))
                        .map(m -> new AmenityDtos.MaintenanceDto(m.getStartDate(), m.getEndDate(), m.getReason()))
                        .toList(),
                c.getUpdatedAt(), c.getUpdatedBy(), c.getVersion());
    }

    private static LocalTime minutes(LocalTime t) {
        return t.withSecond(0).withNano(0);
    }

    private static BusinessException invalid(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
