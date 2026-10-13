package com.bihome.sos;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.notification.NotificationService;
import com.bihome.notification.NotificationType;
import com.bihome.sos.SosAlert.Status;
import com.bihome.sos.dto.SosDtos;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cảnh báo khẩn cấp (SOS): tạo, tiếp nhận, kết thúc; báo ngay cho nhân viên có quyền SOS của tòa. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SosAlertService {

    static final int ACTIVE_LIMIT = 5;
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of("code", "code", "createdAt", "createdAt", "status", "status",
            "alertType", "alertType", "resolvedAt", "resolvedAt");
    static final Map<SosAlert.AlertType, String> TYPE_LABELS = new EnumMap<>(Map.of(
            SosAlert.AlertType.FIRE, "Cháy nổ", SosAlert.AlertType.MEDICAL, "Cấp cứu y tế",
            SosAlert.AlertType.SECURITY, "An ninh", SosAlert.AlertType.ELEVATOR, "Kẹt thang máy",
            SosAlert.AlertType.OTHER, "Khẩn cấp khác"));

    private final SosAlertRepository alerts;
    private final ApartmentService apartmentService;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final NotificationService notificationService;
    private final AppUserRepository users;
    private final DailyCodeGenerator codes;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<SosDtos.Response> list(SosDtos.Filter f, PageParams pageParams) {
        return PageResponse.of(alerts.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS)), SosAlertService::toResponse);
    }

    /** Cảnh báo đang mở trong phạm vi tòa đang chọn (nút SOS trên header hỏi định kỳ). */
    public SosDtos.Active active() {
        Specification<SosAlert> open = spec(new SosDtos.Filter(null, null, null, null, null, true, null, null, null));
        List<SosAlert> latest = alerts.findAll(open, PageRequest.of(0, ACTIVE_LIMIT, DEFAULT_SORT)).getContent();
        long count = alerts.count(open);
        long newCount = alerts.count(spec(new SosDtos.Filter(null, null, null, null, Status.NEW, null, null, null, null)));
        return new SosDtos.Active(count, newCount, latest.isEmpty() ? null : latest.getFirst().getId(),
                latest.stream().map(SosAlertService::toResponse).toList());
    }

    public SosDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    @Transactional
    public SosDtos.Response create(SosDtos.CreateRequest req) {
        return create(req, SosAlert.Source.MANUAL);
    }

    /** {@code APP}: cư dân bấm SOS trên app (residentapp đã kiểm tra căn hộ thuộc cư dân và chọn tòa của căn). */
    @Transactional
    public SosDtos.Response create(SosDtos.CreateRequest req, SosAlert.Source source) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động.");
        Apartment apartment = null;
        if (req.apartmentId() != null) {
            apartment = apartmentService.requireAccessible(req.apartmentId());
            if (!apartment.getBuildingId().equals(buildingId)) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId", "Căn hộ không thuộc tòa nhà đang chọn.");
            }
        }
        String location = trimToNull(req.location());
        if (apartment == null && location == null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "location", "Nhập vị trí hoặc chọn căn hộ.");
        }
        SosAlert a = new SosAlert();
        a.setBuildingId(buildingId);
        a.setCode(codes.next("SOS"));
        a.setAlertType(req.alertType());
        a.setSource(source);
        a.setApartmentId(apartment == null ? null : apartment.getId());
        a.setReporterName(trimToNull(req.reporterName()));
        a.setReporterPhone(req.reporterPhone() == null || req.reporterPhone().isBlank() ? null
                : PhoneNumbers.normalize(req.reporterPhone()));
        a.setLocation(location);
        a.setDescription(trimToNull(req.description()));
        a.setStatus(Status.NEW);
        a = alerts.save(a);
        notifyStaff(a, apartment);
        entityManager.flush();
        entityManager.clear();
        return get(a.getId());
    }

    @Transactional
    public SosDtos.Response acknowledge(Long id, Long version, AuthUser actor) {
        SosAlert a = requireAccessible(id);
        requireVersion(a, version);
        if (a.getStatus() != Status.NEW) {
            throw new BusinessException(ErrorCode.CONFLICT, "Cảnh báo đã được tiếp nhận hoặc đã kết thúc.");
        }
        a.setStatus(Status.ACKNOWLEDGED);
        a.setAcknowledgedAt(OffsetDateTime.now(clock));
        a.setAcknowledgedBy(actor.username());
        alerts.flush();
        return toResponse(a);
    }

    @Transactional
    public SosDtos.Response resolve(Long id, SosDtos.ResolveRequest req, AuthUser actor) {
        SosAlert a = requireAccessible(id);
        requireVersion(a, req.version());
        if (!SosAlert.OPEN.contains(a.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Cảnh báo đã kết thúc.");
        }
        if (req.status() != Status.RESOLVED && req.status() != Status.FALSE_ALARM) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "status", "Chọn Đã xử lý hoặc Báo nhầm.");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (a.getAcknowledgedAt() == null) {
            a.setAcknowledgedAt(now);
            a.setAcknowledgedBy(actor.username());
        }
        a.setStatus(req.status());
        a.setResolvedAt(now);
        a.setResolvedBy(actor.username());
        a.setResolutionNote(req.note().trim());
        alerts.flush();
        return toResponse(a);
    }

    private void notifyStaff(SosAlert a, Apartment apartment) {
        List<Long> recipients = users.findHandlers("SOS_READ", a.getBuildingId(), UserStatus.ACTIVE).stream()
                .filter(u -> u.getBuildingIds().contains(a.getBuildingId())).map(AppUser::getId).toList();
        String where = apartment != null ? "Căn " + apartment.getCode() + (a.getLocation() == null ? "" : " · " + a.getLocation())
                : a.getLocation();
        notificationService.notify(recipients, NotificationType.SOS_ALERT, "SOS " + TYPE_LABELS.get(a.getAlertType()) + " – " + where,
                a.getDescription(), "/sos-alerts?view=" + a.getId(), a.getBuildingId());
    }

    private SosAlert requireAccessible(Long id) {
        return alerts.findById(id).filter(a -> buildingService.canAccess(a.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cảnh báo."));
    }

    private static void requireVersion(SosAlert a, Long version) {
        if (!Objects.equals(a.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private Specification<SosAlert> spec(SosDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<SosAlert>create()
                .likeAny(f.keyword(), "code", "location", "description", "reporterName", "reporterPhone", "apartment.code")
                .like("code", f.code())
                .eq("alertType", f.alertType())
                .eq("status", f.status())
                .in("status", Boolean.TRUE.equals(f.open()) ? SosAlert.OPEN : null)
                .like("apartment.code", f.apartment())
                .dateBetween("createdAt", f.from(), f.to())
                .and(scope.map(ids -> (Specification<SosAlert>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    static SosDtos.Response toResponse(SosAlert a) {
        return new SosDtos.Response(a.getId(), a.getBuildingId(), a.getBuilding().getName(), a.getCode(), a.getAlertType(),
                a.getSource(), a.getApartmentId(), a.getApartment() == null ? null : a.getApartment().getCode(),
                a.getReporterName(), a.getReporterPhone(), a.getLocation(), a.getDescription(), a.getStatus(),
                a.getAcknowledgedAt(), a.getAcknowledgedBy(), a.getResolvedAt(), a.getResolvedBy(), a.getResolutionNote(),
                a.getCreatedAt(), a.getCreatedBy(), a.getVersion());
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
