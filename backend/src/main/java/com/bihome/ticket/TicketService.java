package com.bihome.ticket;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.common.util.AppTime;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentService;
import com.bihome.ticket.TicketEnums.EntryType;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.ticket.TicketEnums.Visibility;
import com.bihome.ticket.dto.TicketDtos;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Yêu cầu và hỗ trợ theo tòa nhà. Mã YC-yyMMdd-xxx tự sinh; hạn phản hồi/xử lý = lúc tạo + SLA của danh mục;
 * chuyển trạng thái theo {@link TicketStatus}; mọi thay đổi trạng thái/phân công/bình luận ghi vào dòng thời gian.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketService {

    static final int BOARD_LIMIT = 50;
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "title", "title",
            "priority", "priority",
            "resolutionDueAt", "resolutionDueAt",
            "status", "status",
            "createdAt", "createdAt",
            "updatedAt", "updatedAt");
    private static final DateTimeFormatter CODE_DAY = DateTimeFormatter.ofPattern("yyMMdd");
    private static final Map<TicketStatus, String> STATUS_LABELS = new EnumMap<>(Map.of(
            TicketStatus.NEW, "Mới",
            TicketStatus.RECEIVED, "Đã tiếp nhận",
            TicketStatus.IN_PROGRESS, "Đang xử lý",
            TicketStatus.WAITING, "Chờ phản hồi",
            TicketStatus.DONE, "Hoàn thành",
            TicketStatus.CLOSED, "Đóng",
            TicketStatus.CANCELLED, "Huỷ"));

    private final TicketRepository tickets;
    private final TicketEntryRepository entries;
    private final TicketCategoryService categoryService;
    private final ApartmentService apartmentService;
    private final ResidentService residentService;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final FileService fileService;
    private final AppUserRepository users;
    private final TicketMapper mapper;
    private final TicketNotifier notifier;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<TicketDtos.Summary> list(TicketDtos.Filter filter, PageParams pageParams) {
        return PageResponse.of(tickets.findAll(spec(filter, filter.status()), pageParams.toPageable(DEFAULT_SORT, SORTS)),
                mapper::toSummary);
    }

    /** Kanban: mỗi trạng thái một cột (bỏ qua filter.status), tối đa 50 yêu cầu mới nhất mỗi cột. */
    public List<TicketDtos.BoardColumn> board(TicketDtos.Filter filter) {
        PageRequest page = PageRequest.of(0, BOARD_LIMIT, DEFAULT_SORT);
        return Arrays.stream(TicketStatus.values()).map(status -> {
            var result = tickets.findAll(spec(filter, status), page);
            return new TicketDtos.BoardColumn(status, result.getTotalElements(),
                    result.getContent().stream().map(mapper::toSummary).toList());
        }).toList();
    }

    /** Số yêu cầu còn mở đã quá hạn SLA trong phạm vi tòa (cho Bảng điều khiển). */
    public long countOverdue(Long buildingId) {
        Optional<Set<Long>> scope = buildingService.listScope(buildingId);
        return tickets.count(Specification.allOf(TicketSpecifications.overdue(now()),
                scope.map(TicketSpecifications::inBuildings).orElse(null)));
    }

    public TicketDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    /** Dòng thời gian từ cũ đến mới. */
    public List<TicketDtos.TimelineEntry> timeline(Long id) {
        Ticket ticket = requireAccessible(id);
        List<TicketEntry> list = entries.findTimeline(id);
        Map<String, String> names = names(list.stream().map(TicketEntry::getCreatedBy).collect(Collectors.toSet()));
        return list.stream().map(e -> mapper.toEntry(e, ticket.getAttachments(), names)).toList();
    }

    /** Người có thể nhận xử lý yêu cầu ở một tòa (mặc định tòa đang chọn). */
    public List<TicketDtos.Assignee> assignees(Long buildingId) {
        Long id = buildingId != null ? buildingId : buildingContext.requireBuildingId();
        buildingService.findAccessible(id);
        return categoryService.handlers(id);
    }

    // ---------------------------------------------------------------- Ghi

    /** Thêm vào tòa đang chọn ở header (hoặc tòa của căn hộ nếu có chọn căn). */
    @Transactional
    public TicketDtos.Response create(TicketDtos.Request req, AuthUser actor) {
        Apartment apartment = req.apartmentId() == null ? null : apartmentService.requireAccessible(req.apartmentId());
        Long buildingId = apartment != null ? apartment.getBuildingId() : buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm yêu cầu.");
        TicketCategory category = categoryService.require(req.categoryId());
        if (category.getStatus() != ActiveStatus.ACTIVE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId", "Danh mục đang ngừng hoạt động.");
        }

        Ticket ticket = new Ticket();
        ticket.setBuildingId(buildingId);
        ticket.setCode(nextCode());
        ticket.setStatus(TicketStatus.NEW);
        applyDetails(ticket, req, apartment, category);
        Long assigneeId = req.assigneeId();
        if (assigneeId != null) {
            requireHandler(assigneeId, buildingId, "assigneeId");
        } else if (category.getDefaultAssigneeId() != null
                && categoryService.isHandler(category.getDefaultAssigneeId(), buildingId)) {
            assigneeId = category.getDefaultAssigneeId();
        }
        ticket.setAssigneeId(assigneeId);
        addEntry(ticket, EntryType.CREATED, Visibility.PUBLIC, null);
        if (assigneeId != null) {
            addEntry(ticket, EntryType.ASSIGNMENT, Visibility.INTERNAL, null).setAssigneeId(assigneeId);
        }
        tickets.saveAndFlush(ticket);
        attachFiles(ticket, req.fileIds(), actor);
        tickets.saveAndFlush(ticket);
        notifier.created(ticket);
        return toResponse(reloaded(ticket.getId()));
    }

    /** Sửa thông tin; đổi danh mục thì tính lại hạn SLA từ lúc tạo. */
    @Transactional
    public TicketDtos.Response update(Long id, TicketDtos.Request req, AuthUser actor) {
        Ticket ticket = requireOpenForChange(id, req.version());
        Apartment apartment = req.apartmentId() == null ? null : apartmentService.requireAccessible(req.apartmentId());
        if (apartment != null && !apartment.getBuildingId().equals(ticket.getBuildingId())) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId", "Căn hộ không thuộc tòa của yêu cầu.");
        }
        TicketCategory category = categoryService.require(req.categoryId());
        if (!category.getId().equals(ticket.getCategoryId()) && category.getStatus() != ActiveStatus.ACTIVE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId", "Danh mục đang ngừng hoạt động.");
        }
        applyDetails(ticket, req, apartment, category);
        attachFiles(ticket, req.fileIds(), actor);
        tickets.saveAndFlush(ticket);
        return toResponse(reloaded(ticket.getId()));
    }

    @Transactional
    public TicketDtos.Response changeStatus(Long id, TicketDtos.StatusRequest req, AuthUser actor) {
        Ticket ticket = requireAccessible(id);
        requireVersion(ticket, req.version());
        TicketStatus from = ticket.getStatus();
        TicketStatus to = req.status();
        if (!from.canMoveTo(to)) {
            throw BusinessException.field(ErrorCode.BUSINESS_RULE_VIOLATION, "status",
                    "Không thể chuyển từ \"" + STATUS_LABELS.get(from) + "\" sang \"" + STATUS_LABELS.get(to) + "\".");
        }
        String note = trimToNull(req.note());
        if (to == TicketStatus.CANCELLED && note == null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "note", "Vui lòng nhập lý do huỷ.");
        }
        OffsetDateTime now = now();
        // Bắt đầu xử lý / hoàn thành mà chưa có người xử lý → giao cho người thao tác.
        if ((to == TicketStatus.IN_PROGRESS || to == TicketStatus.DONE) && ticket.getAssigneeId() == null) {
            ticket.setAssigneeId(actor.id());
            addEntry(ticket, EntryType.ASSIGNMENT, Visibility.INTERNAL, "Tự phân công khi chuyển trạng thái")
                    .setAssigneeId(actor.id());
        }
        if (ticket.getRespondedAt() == null) {
            ticket.setRespondedAt(now);
        }
        if (to == TicketStatus.DONE) {
            ticket.setResolvedAt(now);
        } else if (from == TicketStatus.DONE && to == TicketStatus.IN_PROGRESS) {
            // Mở lại thì chưa hoàn thành; Đóng thì giữ thời điểm hoàn thành.
            ticket.setResolvedAt(null);
        }
        if (to == TicketStatus.CLOSED) {
            ticket.setClosedAt(now);
        }
        ticket.setStatus(to);
        TicketEntry entry = addEntry(ticket, EntryType.STATUS_CHANGE,
                req.visibility() == null ? Visibility.PUBLIC : req.visibility(), note);
        entry.setFromStatus(from);
        entry.setToStatus(to);
        tickets.saveAndFlush(ticket);
        notifier.statusChanged(ticket, STATUS_LABELS.get(to));
        return toResponse(reloaded(ticket.getId()));
    }

    @Transactional
    public TicketDtos.Response assign(Long id, TicketDtos.AssignRequest req) {
        Ticket ticket = requireOpenForChange(id, req.version());
        if (!Objects.equals(ticket.getAssigneeId(), req.assigneeId())) {
            if (req.assigneeId() != null) {
                requireHandler(req.assigneeId(), ticket.getBuildingId(), "assigneeId");
            }
            ticket.setAssigneeId(req.assigneeId());
            addEntry(ticket, EntryType.ASSIGNMENT, Visibility.INTERNAL, null).setAssigneeId(req.assigneeId());
            tickets.saveAndFlush(ticket);
            notifier.assigned(ticket);
            return toResponse(reloaded(ticket.getId()));
        }
        return toResponse(ticket);
    }

    /** Bình luận nội bộ / công khai, có thể kèm tệp; được bình luận cả khi đã đóng. */
    @Transactional
    public TicketDtos.TimelineEntry comment(Long id, TicketDtos.CommentRequest req, AuthUser actor) {
        Ticket ticket = requireAccessible(id);
        TicketEntry entry = addEntry(ticket, EntryType.COMMENT, req.visibility(), req.content().trim());
        entries.saveAndFlush(entry);
        List<Long> fileIds = req.fileIds() == null ? List.of() : req.fileIds().stream().distinct().toList();
        for (Long fileId : fileIds) {
            requireNewFile(fileId, actor);
            ticket.getAttachments().add(new TicketAttachment(ticket, entry.getId(), fileId));
        }
        tickets.saveAndFlush(ticket);
        notifier.commented(ticket, req.visibility());
        Ticket fresh = reloaded(id);
        TicketEntry saved = entries.findById(entry.getId()).orElseThrow();
        return mapper.toEntry(saved, fresh.getAttachments(), names(Set.of(saved.getCreatedBy())));
    }

    /** Đánh giá (ban quản lý ghi nhận thay cư dân; app cư dân dùng sau) khi đã Hoàn thành / Đóng. */
    @Transactional
    public TicketDtos.Response rate(Long id, TicketDtos.RatingRequest req) {
        Ticket ticket = requireAccessible(id);
        if (ticket.getStatus() != TicketStatus.DONE && ticket.getStatus() != TicketStatus.CLOSED) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Chỉ đánh giá được yêu cầu đã Hoàn thành hoặc Đóng.");
        }
        String comment = trimToNull(req.comment());
        ticket.setRating(req.rating());
        ticket.setRatingComment(comment);
        addEntry(ticket, EntryType.RATING, Visibility.PUBLIC,
                req.rating() + " sao" + (comment == null ? "" : " — " + comment));
        tickets.saveAndFlush(ticket);
        return toResponse(reloaded(ticket.getId()));
    }

    /** Chỉ xoá yêu cầu Mới (tạo nhầm) hoặc đã Huỷ; tệp đính kèm xoá theo. */
    @Transactional
    public void delete(Long id) {
        Ticket ticket = requireAccessible(id);
        if (ticket.getStatus() != TicketStatus.NEW && ticket.getStatus() != TicketStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Chỉ xoá được yêu cầu ở trạng thái Mới hoặc đã Huỷ; yêu cầu khác hãy chuyển sang Huỷ / Đóng.");
        }
        List<Long> fileIds = ticket.getAttachments().stream().map(TicketAttachment::getFileId).toList();
        // Tệp của bình luận tham chiếu TICKET_COMMENT nên xoá tệp đính kèm trước.
        ticket.getAttachments().clear();
        tickets.saveAndFlush(ticket);
        tickets.delete(ticket);
        tickets.flush();
        fileService.deleteAll(fileIds);
    }

    // ---------------------------------------------------------------- Helpers

    /** Yêu cầu phải thuộc tòa user được truy cập, nếu không → 404. */
    Ticket requireAccessible(Long id) {
        return tickets.findById(id)
                .filter(t -> buildingService.canAccess(t.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu."));
    }

    private Ticket requireOpenForChange(Long id, Long version) {
        Ticket ticket = requireAccessible(id);
        requireVersion(ticket, version);
        if (ticket.getStatus().isFinal()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Yêu cầu đã " + STATUS_LABELS.get(ticket.getStatus()).toLowerCase() + ", không thể sửa.");
        }
        return ticket;
    }

    private void applyDetails(Ticket ticket, TicketDtos.Request req, Apartment apartment, TicketCategory category) {
        Resident resident = req.residentId() == null ? null : residentService.requireAccessible(req.residentId());
        if (resident != null) {
            if (!resident.getBuildingId().equals(ticket.getBuildingId())) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "residentId", "Cư dân không thuộc tòa của yêu cầu.");
            }
            if (apartment != null && resident.activeLinks().stream()
                    .noneMatch(l -> l.getApartmentId().equals(apartment.getId()))) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "residentId", "Cư dân không ở căn hộ đã chọn.");
            }
        }
        boolean categoryChanged = !category.getId().equals(ticket.getCategoryId());
        ticket.setCategoryId(category.getId());
        if (categoryChanged) {
            OffsetDateTime base = ticket.getCreatedAt() != null ? ticket.getCreatedAt() : now();
            ticket.setResponseDueAt(base.plusHours(category.getResponseSlaHours()));
            ticket.setResolutionDueAt(base.plusHours(category.getResolutionSlaHours()));
        }
        ticket.setTitle(req.title().trim());
        ticket.setDescription(trimToNull(req.description()));
        ticket.setApartmentId(apartment == null ? null : apartment.getId());
        ticket.setResidentId(resident == null ? null : resident.getId());
        ticket.setChannel(req.channel());
        ticket.setPriority(req.priority());
    }

    /** Đồng bộ tệp của yêu cầu với danh sách gửi lên; tệp bị bỏ ra được xoá sau khi commit. */
    private void attachFiles(Ticket ticket, List<Long> fileIds, AuthUser actor) {
        List<Long> wanted = fileIds == null ? List.of() : fileIds.stream().distinct().toList();
        List<TicketAttachment> current = ticket.getAttachments().stream().filter(a -> a.getEntryId() == null).toList();
        Set<Long> currentIds = current.stream().map(TicketAttachment::getFileId).collect(Collectors.toSet());
        for (Long fileId : wanted) {
            if (!currentIds.contains(fileId)) {
                requireNewFile(fileId, actor);
                ticket.getAttachments().add(new TicketAttachment(ticket, null, fileId));
            }
        }
        Set<Long> keep = new HashSet<>(wanted);
        List<Long> removed = new ArrayList<>();
        for (TicketAttachment a : current) {
            if (!keep.contains(a.getFileId())) {
                ticket.getAttachments().remove(a);
                removed.add(a.getFileId());
            }
        }
        if (!removed.isEmpty()) {
            tickets.saveAndFlush(ticket);
            fileService.deleteAll(removed);
        }
    }

    private void requireNewFile(Long fileId, AuthUser actor) {
        fileService.requireOwnUpload(fileId, FilePurpose.TICKET_ATTACHMENT, actor, "fileIds", "Tệp đính kèm không hợp lệ.");
    }

    private void requireHandler(Long userId, Long buildingId, String field) {
        if (!categoryService.isHandler(userId, buildingId)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, field,
                    "Người xử lý phải là người dùng đang hoạt động, có quyền xử lý yêu cầu ở tòa nhà này.");
        }
    }

    private static TicketEntry addEntry(Ticket ticket, EntryType type, Visibility visibility, String content) {
        TicketEntry entry = new TicketEntry();
        entry.setTicket(ticket);
        entry.setType(type);
        entry.setVisibility(visibility);
        entry.setContent(content);
        ticket.getEntries().add(entry);
        return entry;
    }

    /** Mã YC-yyMMdd-xxx (ngày theo giờ Việt Nam); khoá dòng đếm của ngày tới khi commit. */
    String nextCode() {
        String day = LocalDate.now(clock.withZone(AppTime.ZONE)).format(CODE_DAY);
        if (tickets.incrementCodeCounter(day) == 0) {
            tickets.insertCodeCounterIfAbsent(day);
            tickets.incrementCodeCounter(day);
        }
        long no = tickets.currentCodeCounter(day);
        return "YC-" + day + "-" + (no < 1000 ? "%03d".formatted(no) : Long.toString(no));
    }

    /**
     * Đọc lại từ DB sau khi ghi: tệp đính kèm / người xử lý mới gắn qua cột id nên quan hệ chỉ đọc (file, assignee...)
     * chưa được nạp trên đối tượng đang giữ.
     */
    private Ticket reloaded(Long id) {
        tickets.flush();
        entityManager.clear();
        return requireAccessible(id);
    }

    private TicketDtos.Response toResponse(Ticket ticket) {
        String createdBy = ticket.getCreatedBy();
        return mapper.toResponse(ticket, createdBy == null ? null : names(Set.of(createdBy)).get(createdBy));
    }

    private Map<String, String> names(Set<String> usernames) {
        Set<String> wanted = usernames.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (wanted.isEmpty()) {
            return Map.of();
        }
        return users.findByUsernameIn(wanted).stream()
                .collect(Collectors.toMap(AppUser::getUsername, TicketMapper::displayName));
    }

    private Specification<Ticket> spec(TicketDtos.Filter filter, TicketStatus status) {
        return TicketSpecifications.tickets(filter, buildingService.listScope(filter.buildingId()), status, now());
    }

    private static void requireVersion(Ticket ticket, Long version) {
        if (version == null || !Objects.equals(ticket.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
