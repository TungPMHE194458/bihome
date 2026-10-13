package com.bihome.reminder;

import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.messaging.MessageSender;
import com.bihome.common.messaging.RichText;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.reminder.Reminder.Channel;
import com.bihome.reminder.Reminder.ScheduleType;
import com.bihome.reminder.Reminder.Status;
import com.bihome.reminder.dto.ReminderDtos;
import com.bihome.resident.ResidentAudienceService.Audience;
import com.bihome.resident.ResidentAudienceService.Recipient;
import com.bihome.resident.ResidentAudienceService;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentInboxService;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nhắc nhở gửi cư dân đang ở của tòa theo đối tượng. Mỗi lần gửi ghi kết quả từng cư dân × kênh vào REMINDER_DELIVERY:
 * trong app lưu chờ app cư dân, email / SMS qua {@link MessageSender} (thiếu email / số điện thoại thì bỏ qua).
 * Job mỗi phút gửi các nhắc nhở đến hạn; lặp hằng tháng tính lần kế tiếp sau mỗi lần gửi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReminderService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of(
            "title", "title", "createdAt", "createdAt", "nextRunAt", "nextRunAt", "lastSentAt", "lastSentAt", "status", "status");
    private static final int SAMPLE = 20;
    private static final int MAX_TEXT = 5000;

    private final ReminderRepository reminders;
    private final ReminderDeliveryRepository deliveries;
    private final ResidentAudienceService audienceService;
    private final MessageSender messageSender;
    private final ResidentInboxService residentInbox;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final EntityManager entityManager;
    private final Clock clock;

    // ---------------------------------------------------------------- Đọc

    public PageResponse<ReminderDtos.Response> list(ReminderDtos.Filter f, PageParams pageParams) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        var spec = SpecificationBuilder.<Reminder>create()
                .likeAny(f.keyword(), "title")
                .like("title", f.title())
                .eq("audience", f.audience())
                .eq("scheduleType", f.scheduleType())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<Reminder>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
        return PageResponse.of(reminders.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORTS)), this::toResponse);
    }

    public ReminderDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    public PageResponse<ReminderDtos.DeliveryResponse> deliveries(Long id, PageParams pageParams) {
        requireAccessible(id);
        return PageResponse.of(deliveries.findByReminderIdOrderByIdDesc(id, pageParams.toPageable(Sort.by("id"), Map.of())),
                d -> new ReminderDtos.DeliveryResponse(d.getId(), d.getRunNo(), d.getResidentId(), d.getResidentName(),
                        d.getApartmentCode(), d.getChannel(), d.getDestination(), d.getStatus(), d.getNote(), d.getSentAt()));
    }

    /** Xem trước số cư dân sẽ nhận ở tòa đang chọn. */
    public ReminderDtos.RecipientPreview preview(ReminderDtos.AudienceRequest req) {
        Long buildingId = buildingContext.requireBuildingId();
        Set<String> targets = audienceService.validateTargets(buildingId, req.audience(), req.targets(), "targets");
        List<Recipient> list = audienceService.resolve(buildingId, req.audience(), targets);
        return new ReminderDtos.RecipientPreview(list.size(),
                (int) list.stream().filter(r -> r.email() != null && !r.email().isBlank()).count(),
                (int) list.stream().filter(r -> r.phone() != null && !r.phone().isBlank()).count(),
                list.stream().limit(SAMPLE).map(r -> r.fullName() + " (" + r.apartments() + ")").toList());
    }

    public List<String> floors() {
        return audienceService.floors(buildingContext.requireBuildingId());
    }

    // ---------------------------------------------------------------- Ghi

    @Transactional
    public ReminderDtos.Response create(ReminderDtos.Request req) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể tạo nhắc nhở.");
        Reminder r = new Reminder();
        r.setBuildingId(buildingId);
        apply(r, req);
        reminders.saveAndFlush(r);
        if (!req.draft() && req.scheduleType() == ScheduleType.NOW) {
            deliver(r);
        }
        entityManager.flush();
        entityManager.clear();
        return get(r.getId());
    }

    @Transactional
    public ReminderDtos.Response update(Long id, ReminderDtos.Request req) {
        Reminder r = requireEditable(id);
        requireVersion(r, req.version());
        apply(r, req);
        reminders.saveAndFlush(r);
        if (!req.draft() && req.scheduleType() == ScheduleType.NOW) {
            deliver(r);
        }
        return toResponse(r);
    }

    /** Gửi ngay một lần (nháp hoặc đã lên lịch). Hẹn giờ một lần / gửi ngay → Đã gửi; lặp hằng tháng giữ lịch. */
    @Transactional
    public ReminderDtos.Response sendNow(Long id, Long version) {
        Reminder r = requireEditable(id);
        requireVersion(r, version);
        deliver(r);
        if (r.getScheduleType() != ScheduleType.MONTHLY) {
            r.setStatus(Status.SENT);
            r.setNextRunAt(null);
        }
        reminders.saveAndFlush(r);
        return toResponse(r);
    }

    @Transactional
    public ReminderDtos.Response cancel(Long id, Long version) {
        Reminder r = requireEditable(id);
        requireVersion(r, version);
        r.setStatus(Status.CANCELLED);
        r.setNextRunAt(null);
        reminders.saveAndFlush(r);
        return toResponse(r);
    }

    /** Chỉ xoá nhắc nhở nháp / đã huỷ (kèm lịch sử gửi). */
    @Transactional
    public void delete(Long id) {
        Reminder r = requireAccessible(id);
        if (r.getStatus() != Status.DRAFT && r.getStatus() != Status.CANCELLED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Chỉ xoá được nhắc nhở nháp hoặc đã huỷ.");
        }
        deliveries.deleteByReminderId(id);
        reminders.delete(r);
    }

    /** Job mỗi phút. @return số nhắc nhở đã gửi */
    @Transactional
    public int sendDue() {
        int sent = 0;
        for (Long id : reminders.findDueIds(OffsetDateTime.now(clock))) {
            Reminder r = reminders.findById(id).orElseThrow();
            if (r.getStatus() != Status.SCHEDULED) {
                continue;
            }
            deliver(r);
            advance(r);
            sent++;
        }
        return sent;
    }

    // ---------------------------------------------------------------- Helpers

    private void apply(Reminder r, ReminderDtos.Request req) {
        String content = RichText.sanitize(req.content());
        String text = RichText.text(content);
        if (text.isEmpty()) {
            throw field("content", "Nội dung không được để trống");
        }
        if (text.length() > MAX_TEXT) {
            throw field("content", "Nội dung tối đa " + MAX_TEXT + " ký tự.");
        }
        r.setTitle(req.title().trim());
        r.setContent(content);
        r.setAudience(req.audience());
        r.setTargets(new LinkedHashSet<>(audienceService.validateTargets(r.getBuildingId(), req.audience(), req.targets(), "targets")));
        r.setChannels(new LinkedHashSet<>(req.channels()));
        r.setScheduleType(req.scheduleType());
        r.setScheduledAt(null);
        r.setMonthlyDay(null);
        r.setMonthlyTime(null);
        r.setEndDate(null);
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime next = null;
        switch (req.scheduleType()) {
            case ONCE -> {
                if (req.scheduledAt() == null) {
                    throw field("scheduledAt", "Vui lòng chọn thời điểm gửi.");
                }
                if (!req.draft() && !req.scheduledAt().isAfter(now)) {
                    throw field("scheduledAt", "Thời điểm gửi phải sau thời điểm hiện tại.");
                }
                r.setScheduledAt(req.scheduledAt());
                next = req.scheduledAt();
            }
            case MONTHLY -> {
                if (req.monthlyDay() == null || req.monthlyTime() == null) {
                    throw field("monthlyDay", "Vui lòng chọn ngày và giờ gửi hằng tháng.");
                }
                r.setMonthlyDay(req.monthlyDay());
                r.setMonthlyTime(req.monthlyTime());
                r.setEndDate(req.endDate());
                next = ReminderSchedule.nextMonthly(req.monthlyDay(), req.monthlyTime(), req.endDate(), now)
                        .orElseThrow(() -> field("endDate", "Ngày kết thúc phải sau lần gửi đầu tiên."));
            }
            default -> {
            }
        }
        if (req.draft()) {
            r.setStatus(Status.DRAFT);
            r.setNextRunAt(null);
        } else if (req.scheduleType() == ScheduleType.NOW) {
            r.setStatus(Status.SENT);
            r.setNextRunAt(null);
        } else {
            r.setStatus(Status.SCHEDULED);
            r.setNextRunAt(next);
        }
    }

    /** Sau một lần gửi theo lịch: hẹn giờ một lần → Đã gửi; hằng tháng → lần kế tiếp hoặc kết thúc. */
    private void advance(Reminder r) {
        if (r.getScheduleType() == ScheduleType.MONTHLY) {
            Optional<OffsetDateTime> next = ReminderSchedule.nextMonthly(r.getMonthlyDay(), r.getMonthlyTime(), r.getEndDate(),
                    r.getNextRunAt() != null ? r.getNextRunAt() : OffsetDateTime.now(clock));
            r.setNextRunAt(next.orElse(null));
            r.setStatus(next.isPresent() ? Status.SCHEDULED : Status.SENT);
        } else {
            r.setStatus(Status.SENT);
            r.setNextRunAt(null);
        }
    }

    /** Gửi một lần tới mọi cư dân thuộc đối tượng, ghi kết quả từng kênh. */
    private void deliver(Reminder r) {
        List<Recipient> recipients = audienceService.resolve(r.getBuildingId(), r.getAudience(), r.getTargets());
        OffsetDateTime now = OffsetDateTime.now(clock);
        int run = r.getRunCount() + 1;
        String text = RichText.text(r.getContent());
        List<ReminderDelivery> batch = new ArrayList<>();
        for (Recipient recipient : recipients) {
            for (Channel channel : r.getChannels().stream().sorted().toList()) {
                ReminderDelivery d = new ReminderDelivery();
                d.setReminderId(r.getId());
                d.setRunNo(run);
                d.setResidentId(recipient.residentId());
                d.setResidentName(recipient.fullName());
                d.setApartmentCode(truncate(recipient.apartments(), 200));
                d.setChannel(channel);
                d.setSentAt(now);
                switch (channel) {
                    case IN_APP -> {
                        d.setStatus(ReminderDelivery.Status.SENT);
                        d.setNote("Hộp thư app cư dân");
                    }
                    case EMAIL -> external(d, MessageSender.Channel.EMAIL, recipient.email(), "Không có email", r.getTitle(), text);
                    case SMS -> external(d, MessageSender.Channel.SMS, recipient.phone(), "Không có số điện thoại", r.getTitle(), text);
                }
                batch.add(d);
            }
        }
        deliveries.saveAll(batch);
        if (r.getChannels().contains(Channel.IN_APP)) {
            residentInbox.toResidents(recipients.stream().map(Recipient::residentId).toList(),
                    ResidentInboxItem.Type.REMINDER, r.getTitle(), text, "/inbox");
        }
        r.setRunCount(run);
        r.setRecipientCount(recipients.size());
        r.setLastSentAt(now);
    }

    private void external(ReminderDelivery d, MessageSender.Channel channel, String destination, String missing,
                          String subject, String text) {
        if (destination == null || destination.isBlank()) {
            d.setStatus(ReminderDelivery.Status.SKIPPED);
            d.setNote(missing);
            return;
        }
        d.setDestination(destination);
        boolean ok;
        try {
            ok = messageSender.send(channel, destination, subject, text);
        } catch (RuntimeException ex) {
            log.warn("Gửi {} tới {} lỗi", channel, destination, ex);
            ok = false;
        }
        d.setStatus(ok ? ReminderDelivery.Status.SENT : ReminderDelivery.Status.FAILED);
        if (!ok) {
            d.setNote("Kênh gửi lỗi");
        }
    }

    Reminder requireAccessible(Long id) {
        return reminders.findById(id)
                .filter(r -> buildingService.canAccess(r.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy nhắc nhở."));
    }

    private Reminder requireEditable(Long id) {
        Reminder r = requireAccessible(id);
        if (r.getStatus() == Status.SENT || r.getStatus() == Status.CANCELLED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Nhắc nhở đã gửi hoặc đã huỷ, không thay đổi được.");
        }
        return r;
    }

    private static void requireVersion(Reminder r, Long version) {
        if (version == null || !Objects.equals(r.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private ReminderDtos.Response toResponse(Reminder r) {
        return new ReminderDtos.Response(r.getId(), r.getBuildingId(), r.getBuilding() == null ? null : r.getBuilding().getName(),
                r.getTitle(), r.getContent(), r.getAudience(), List.copyOf(r.getTargets()),
                audienceService.label(r.getAudience(), r.getTargets()), audienceService.describe(r.getAudience(), r.getTargets()),
                r.getChannels().stream().sorted().toList(), r.getScheduleType(), r.getScheduledAt(), r.getMonthlyDay(),
                r.getMonthlyTime(), r.getEndDate(), r.getNextRunAt(), r.getLastSentAt(), r.getRunCount(), r.getRecipientCount(),
                r.getStatus(), r.getCreatedAt(), r.getUpdatedAt(), r.getCreatedBy(), r.getVersion());
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private static BusinessException field(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }
}
