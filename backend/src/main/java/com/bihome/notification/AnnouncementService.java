package com.bihome.notification;

import com.bihome.building.BuildingRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.storage.FileAttachment;
import com.bihome.common.storage.FileAttachmentRepository;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.notification.Announcement.Status;
import com.bihome.notification.dto.AnnouncementDtos;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thông báo do Ban quản lý soạn: lưu nháp, hẹn giờ hoặc gửi ngay. Gửi = tạo thông báo trong hệ thống cho nhân viên
 * của tòa (đối tượng STAFF / ALL); cư dân (RESIDENT / ALL) chỉ được đếm, sẽ nhận qua app cư dân.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnnouncementService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of(
            "title", "title", "createdAt", "createdAt", "sentAt", "sentAt", "scheduledAt", "scheduledAt");
    private static final int PREVIEW = 300;

    private final AnnouncementRepository announcements;
    private final BuildingRepository buildings;
    private final FileAttachmentRepository files;
    private final FileService fileService;
    private final NotificationService notificationService;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<AnnouncementDtos.Response> list(AnnouncementDtos.Filter f, PageParams pageParams) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        var spec = SpecificationBuilder.<Announcement>create()
                .likeAny(f.keyword(), "title", "content")
                .like("title", f.title())
                .eq("category", f.category())
                .eq("audience", f.audience())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<Announcement>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
        var page = announcements.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORTS));
        Map<Long, FileAttachment> attached = attachments(page.getContent().stream()
                .flatMap(a -> a.getFileIds().stream()).collect(Collectors.toSet()));
        return PageResponse.of(page, a -> toResponse(a, attached));
    }

    public AnnouncementDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    @Transactional
    public AnnouncementDtos.Response create(AnnouncementDtos.Request req) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể tạo thông báo.");
        Announcement a = new Announcement();
        a.setBuildingId(buildingId);
        apply(a, req, CurrentUser.get());
        announcements.saveAndFlush(a);
        entityManager.refresh(a);
        return toResponse(a);
    }

    @Transactional
    public AnnouncementDtos.Response update(Long id, AnnouncementDtos.Request req) {
        Announcement a = requireEditable(id);
        if (req.version() == null || !Objects.equals(a.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        List<Long> before = List.copyOf(a.getFileIds());
        apply(a, req, CurrentUser.get());
        announcements.saveAndFlush(a);
        List<Long> removed = before.stream().filter(fileId -> !a.getFileIds().contains(fileId)).toList();
        fileService.deleteAll(removed);
        return toResponse(a);
    }

    /** Gửi ngay một thông báo nháp / hẹn giờ. */
    @Transactional
    public AnnouncementDtos.Response send(Long id, Long version) {
        Announcement a = requireEditable(id);
        if (version == null || !Objects.equals(a.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        deliver(a, CurrentUser.get().username());
        announcements.saveAndFlush(a);
        return toResponse(a);
    }

    /** Job gọi mỗi phút: gửi thông báo đến giờ hẹn. */
    @Transactional
    public int sendDue() {
        int sent = 0;
        for (Long id : announcements.findDueIds(OffsetDateTime.now(clock))) {
            Announcement a = announcements.findById(id).orElseThrow();
            if (a.getStatus() == Status.SCHEDULED) {
                deliver(a, a.getCreatedBy());
                sent++;
            }
        }
        return sent;
    }

    @Transactional
    public void delete(Long id) {
        Announcement a = requireEditable(id);
        List<Long> fileIds = List.copyOf(a.getFileIds());
        announcements.delete(a);
        announcements.flush();
        fileService.deleteAll(fileIds);
    }

    // ---------------------------------------------------------------- Helpers

    Announcement requireAccessible(Long id) {
        return announcements.findById(id)
                .filter(a -> buildingService.canAccess(a.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo."));
    }

    private Announcement requireEditable(Long id) {
        Announcement a = requireAccessible(id);
        if (a.getStatus() == Status.SENT) {
            throw new BusinessException(ErrorCode.CONFLICT, "Thông báo đã gửi, không sửa / xoá được.");
        }
        return a;
    }

    private void apply(Announcement a, AnnouncementDtos.Request req, AuthUser actor) {
        a.setTitle(req.title().trim());
        a.setContent(req.content().trim());
        a.setCategory(req.category());
        a.setAudience(req.audience());
        if (req.scheduledAt() == null) {
            a.setStatus(Status.DRAFT);
            a.setScheduledAt(null);
        } else {
            if (!req.scheduledAt().isAfter(OffsetDateTime.now(clock))) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "scheduledAt",
                        "Thời điểm gửi phải sau thời điểm hiện tại.");
            }
            a.setStatus(Status.SCHEDULED);
            a.setScheduledAt(req.scheduledAt());
        }
        List<Long> wanted = req.fileIds() == null ? List.of() : req.fileIds().stream().distinct().toList();
        Set<Long> current = new HashSet<>(a.getFileIds());
        for (Long fileId : wanted) {
            if (!current.contains(fileId)) {
                fileService.requireOwnUpload(fileId, FilePurpose.ANNOUNCEMENT_ATTACHMENT, actor, "fileIds",
                        "Tệp đính kèm không hợp lệ.");
            }
        }
        a.setFileIds(new ArrayList<>(wanted));
    }

    private void deliver(Announcement a, String sentBy) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        int staff = 0;
        if (a.getAudience().includesStaff()) {
            String body = a.getContent().length() > PREVIEW ? a.getContent().substring(0, PREVIEW - 1) + "…" : a.getContent();
            staff = notificationService.notify(announcements.findStaffIds(a.getBuildingId()), NotificationType.ANNOUNCEMENT,
                    a.getTitle(), body, "/announcements?view=" + a.getId(), a.getBuildingId());
        }
        a.setStaffCount(staff);
        a.setResidentCount(a.getAudience().includesResidents() ? (int) buildings.countResidents(a.getBuildingId()) : 0);
        a.setStatus(Status.SENT);
        a.setSentAt(now);
        a.setSentBy(sentBy);
    }

    private Map<Long, FileAttachment> attachments(Set<Long> ids) {
        return ids.isEmpty() ? Map.of()
                : files.findAllById(ids).stream().collect(Collectors.toMap(FileAttachment::getId, Function.identity()));
    }

    private AnnouncementDtos.Response toResponse(Announcement a) {
        return toResponse(a, attachments(new HashSet<>(a.getFileIds())));
    }

    private AnnouncementDtos.Response toResponse(Announcement a, Map<Long, FileAttachment> attached) {
        List<AnnouncementDtos.Attachment> list = a.getFileIds().stream()
                .map(attached::get)
                .filter(Objects::nonNull)
                .map(f -> new AnnouncementDtos.Attachment(f.getId(), f.getOriginalName(), f.getFileSize(),
                        f.getContentType(), fileService.urlFor(f.getId())))
                .toList();
        return new AnnouncementDtos.Response(a.getId(), a.getBuildingId(), a.getBuilding().getName(), a.getTitle(),
                a.getContent(), a.getCategory(), a.getAudience(), a.getStatus(), a.getScheduledAt(), a.getSentAt(),
                a.getSentBy(), a.getStaffCount(), a.getResidentCount(), list, a.getCreatedAt(), a.getUpdatedAt(),
                a.getCreatedBy(), a.getVersion());
    }
}
