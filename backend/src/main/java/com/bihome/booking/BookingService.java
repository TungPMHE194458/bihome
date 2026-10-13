package com.bihome.booking;

import com.bihome.amenity.Amenity;
import com.bihome.amenity.AmenityConfig;
import com.bihome.amenity.AmenityConfigRepository;
import com.bihome.amenity.AmenityService;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.booking.AmenityBooking.Status;
import com.bihome.booking.dto.BookingDtos;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.notification.NotificationService;
import com.bihome.notification.NotificationType;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentRepository;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentInboxService;
import com.bihome.transaction.FinancialTransaction.Method;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.transaction.FinancialTransaction;
import com.bihome.transaction.TransactionService;
import com.bihome.transaction.dto.TransactionDtos;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.VoucherRedemptionService.Redemption;
import com.bihome.voucher.VoucherRedemptionService.Target;
import com.bihome.voucher.VoucherRedemptionService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
 * Đăng ký tiện ích. Đặt chỗ khoá dòng cấu hình của tiện ích (SELECT ... FOR UPDATE) rồi mới kiểm tra sức chứa khung
 * giờ và giới hạn lượt / tuần, nên đặt đồng thời không vượt. Tiện ích cần duyệt → Chờ duyệt, ngược lại Đã duyệt.
 * Có phí → giao dịch chưa thanh toán; huỷ trước hạn huỷ miễn phí (hoặc từ chối) → trả voucher và huỷ / hoàn tiền,
 * huỷ muộn → giữ phí.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "bookingDate")
            .and(Sort.by(Sort.Direction.DESC, "startTime")).and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of(
            "code", "code", "bookingDate", "bookingDate", "total", "total", "status", "status", "createdAt", "createdAt",
            "amenityName", "amenity.name", "apartmentCode", "apartment.code");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int MAX_CALENDAR_DAYS = 31;
    private static final String[] DAY_LABELS = {"", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"};

    private final AmenityBookingRepository bookings;
    private final AmenityConfigRepository configs;
    private final AmenityService amenityService;
    private final ApartmentService apartmentService;
    private final ResidentRepository residents;
    private final BuildingService buildingService;
    private final DailyCodeGenerator codes;
    private final TransactionService transactionService;
    private final VoucherRedemptionService voucherService;
    private final NotificationService notificationService;
    private final AppUserRepository users;
    private final ResidentInboxService residentInbox;
    private final EntityManager entityManager;
    private final Clock clock;

    // ---------------------------------------------------------------- Đọc

    public PageResponse<BookingDtos.Response> list(BookingDtos.Filter f, PageParams pageParams) {
        var page = bookings.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS));
        Map<Long, TransactionDtos.Summary> tx = transactionService.summaries(SourceType.AMENITY_BOOKING,
                page.getContent().stream().map(AmenityBooking::getId).toList());
        return PageResponse.of(page, b -> toResponse(b, tx.get(b.getId()), null));
    }

    public BookingDtos.Response get(Long id) {
        AmenityBooking b = requireAccessible(id);
        return toResponse(b, summary(b), configs.findById(b.getAmenityId()).orElse(null));
    }

    /** Các khung giờ trong {@code days} ngày từ {@code from}: sức chứa, đã đặt, còn lại, giá. */
    public BookingDtos.AvailabilityResponse availability(Long amenityId, LocalDate from, int days) {
        Amenity amenity = amenityService.requireAccessible(amenityId);
        AmenityConfig config = amenityService.requireConfig(amenityId);
        int span = Math.max(1, Math.min(days, MAX_CALENDAR_DAYS));
        LocalDate to = from.plusDays(span - 1L);
        List<AmenityBooking> holding = bookings.findInRange(amenityId, from, to, Status.HOLDING);
        LocalDate today = today();
        LocalTime nowTime = LocalTime.now(clock.withZone(AppTime.ZONE));
        List<BookingDtos.DayAvailability> result = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            LocalDate d = date;
            String closed = closedReason(amenity, config, d, today);
            List<BookingDtos.SlotAvailability> slots = slotsOf(config, d).stream().map(s -> {
                int capacity = capacity(amenity, s);
                long booked = holding.stream()
                        .filter(b -> b.getBookingDate().equals(d) && b.getStartTime().isBefore(s.getEndTime())
                                && b.getEndTime().isAfter(s.getStartTime()))
                        .mapToLong(AmenityBooking::getPeopleCount).sum();
                Optional<AmenityConfig.Price> price = config.priceFor(d, s.getStartTime());
                boolean past = d.isBefore(today) || (d.equals(today) && !s.getStartTime().isAfter(nowTime));
                return new BookingDtos.SlotAvailability(s.getStartTime(), s.getEndTime(), capacity, booked,
                        Math.max(0, capacity - booked), price.map(AmenityConfig.Price::getPrice).orElse(BigDecimal.ZERO),
                        price.map(AmenityConfig.Price::getPriceUnit).orElse(null), past);
            }).toList();
            result.add(new BookingDtos.DayAvailability(d, closed, slots));
        }
        return new BookingDtos.AvailabilityResponse(amenity.getId(), amenity.getName(), amenity.getCapacity(),
                amenity.isRequiresApproval(), config.getMaxAdvanceDays(), config.getMaxBookingsPerWeek(),
                config.getFreeCancelHours(), result);
    }

    /** Lịch tuần (hoặc khoảng ngày) của một tiện ích: khả dụng + các lượt đang giữ chỗ. */
    public BookingDtos.CalendarResponse calendar(Long amenityId, LocalDate from, int days) {
        BookingDtos.AvailabilityResponse availability = availability(amenityId, from, days);
        LocalDate to = from.plusDays(Math.max(1, Math.min(days, MAX_CALENDAR_DAYS)) - 1L);
        List<BookingDtos.CalendarBooking> list = bookings.findInRange(amenityId, from, to, Status.HOLDING).stream()
                .map(b -> new BookingDtos.CalendarBooking(b.getId(), b.getCode(), b.getBookingDate(), b.getStartTime(),
                        b.getEndTime(), b.getApartment().getCode(), b.getPeopleCount(), b.getStatus()))
                .toList();
        return new BookingDtos.CalendarResponse(availability, list);
    }

    /** Tính thử phí + voucher cho form (không giữ chỗ). */
    public BookingDtos.QuoteResponse quote(BookingDtos.Request req) {
        Checked c = check(req, false);
        BigDecimal fee = c.fee();
        Optional<Redemption> redemption = voucherService.preview(req.voucherCode(), target(c, req.bookingDate()), fee);
        BigDecimal discount = redemption.map(Redemption::discount).orElse(BigDecimal.ZERO);
        return new BookingDtos.QuoteResponse(c.unitPrice(), c.priceUnit(), fee,
                redemption.map(r -> r.voucher().getCode()).orElse(null), discount, fee.subtract(discount),
                c.amenity().isRequiresApproval(), (int) c.remaining());
    }

    // ---------------------------------------------------------------- Ghi

    @Transactional
    public BookingDtos.Response create(BookingDtos.Request req) {
        Checked c = check(req, true);
        Optional<Redemption> redemption = voucherService.redeem(req.voucherCode(), target(c, req.bookingDate()), c.fee());
        BigDecimal discount = redemption.map(Redemption::discount).orElse(BigDecimal.ZERO);

        AmenityBooking b = new AmenityBooking();
        b.setBuildingId(c.amenity().getBuildingId());
        b.setCode(codes.next("DK"));
        b.setAmenityId(c.amenity().getId());
        b.setApartmentId(c.apartment().getId());
        b.setResidentId(req.residentId());
        b.setBookingDate(req.bookingDate());
        b.setStartTime(c.slot().getStartTime());
        b.setEndTime(c.slot().getEndTime());
        b.setPeopleCount(req.peopleCount());
        b.setUnitPrice(c.unitPrice());
        b.setPriceUnit(c.priceUnit());
        b.setFee(c.fee());
        b.setVoucherId(redemption.map(r -> r.voucher().getId()).orElse(null));
        b.setDiscount(discount);
        b.setTotal(c.fee().subtract(discount));
        b.setNote(trimToNull(req.note()));
        if (c.amenity().isRequiresApproval()) {
            b.setStatus(Status.PENDING);
        } else {
            b.setStatus(Status.APPROVED);
            b.setDecidedAt(OffsetDateTime.now(clock));
            b.setDecidedBy("tự động");
        }
        bookings.saveAndFlush(b);
        redemption.ifPresent(r -> voucherService.recordUsage(r, b.getApartmentId(), SourceType.AMENITY_BOOKING, b.getId()));
        transactionService.record(SourceType.AMENITY_BOOKING, b.getId(), b.getCode(), b.getBuildingId(), b.getApartmentId(),
                b.getResidentId(), b.getTotal(), "Phí sử dụng " + c.amenity().getName() + " " + slotText(b));
        if (b.getStatus() == Status.PENDING) {
            notifyApprovers(b, c.amenity(), c.apartment());
        }
        // Nạp lại để có các quan hệ chỉ đọc (tòa, tiện ích / dịch vụ, căn hộ...) của bản ghi vừa tạo.
        entityManager.flush();
        entityManager.clear();
        return get(b.getId());
    }

    @Transactional
    public BookingDtos.Response approve(Long id, Long version) {
        AmenityBooking b = requireVersion(requireAccessible(id), version);
        requireStatus(b, Status.PENDING, "duyệt");
        b.setStatus(Status.APPROVED);
        decided(b);
        bookings.saveAndFlush(b);
        notifyResident(b, "Lượt đặt " + b.getCode() + " đã được duyệt", slotText(b));
        return get(id);
    }

    @Transactional
    public BookingDtos.Response reject(Long id, BookingDtos.ReasonRequest req) {
        AmenityBooking b = requireVersion(requireAccessible(id), req.version());
        requireStatus(b, Status.PENDING, "từ chối");
        b.setStatus(Status.REJECTED);
        b.setRejectReason(req.reason().trim());
        decided(b);
        releaseFully(b);
        bookings.saveAndFlush(b);
        notifyResident(b, "Lượt đặt " + b.getCode() + " bị từ chối", "Lý do: " + b.getRejectReason());
        return get(id);
    }

    /** Hộp thư app: cư dân đặt lượt (nếu có), không thì cư dân có tài khoản đang ở căn. */
    private void notifyResident(AmenityBooking b, String title, String body) {
        String link = "/bookings/" + b.getId();
        if (b.getResidentId() != null) {
            residentInbox.toResidents(List.of(b.getResidentId()), ResidentInboxItem.Type.BOOKING, title, body, link);
        } else {
            residentInbox.toApartment(b.getApartmentId(), ResidentInboxItem.Type.BOOKING, title, body, link);
        }
    }

    /**
     * Huỷ lượt Chờ duyệt / Đã duyệt. Chờ duyệt hoặc trước hạn huỷ miễn phí: trả voucher, huỷ khoản chưa thu / hoàn
     * khoản đã thu. Huỷ muộn: giữ nguyên khoản phí.
     */
    @Transactional
    public BookingDtos.Response cancel(Long id, BookingDtos.ReasonRequest req) {
        AmenityBooking b = requireVersion(requireAccessible(id), req.version());
        if (!b.getStatus().isOpen()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ huỷ được lượt đang chờ duyệt hoặc đã duyệt.");
        }
        AmenityConfig config = amenityService.requireConfig(b.getAmenityId());
        boolean free = b.getStatus() == Status.PENDING || !OffsetDateTime.now(clock).isAfter(freeCancelUntil(b, config));
        b.setStatus(Status.CANCELLED);
        b.setCancelReason(req.reason().trim());
        b.setCancelledAt(OffsetDateTime.now(clock));
        if (free) {
            releaseFully(b);
        }
        bookings.saveAndFlush(b);
        return get(id);
    }

    @Transactional
    public BookingDtos.Response complete(Long id, Long version) {
        AmenityBooking b = requireVersion(requireAccessible(id), version);
        requireStatus(b, Status.APPROVED, "hoàn thành");
        if (start(b).isAfter(LocalDateTime.now(clock.withZone(AppTime.ZONE)))) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chưa đến giờ sử dụng, chưa hoàn thành được.");
        }
        b.setStatus(Status.COMPLETED);
        b.setCompletedAt(OffsetDateTime.now(clock));
        bookings.saveAndFlush(b);
        return get(id);
    }

    @Transactional
    public BookingDtos.Response pay(Long id, Method method) {
        AmenityBooking b = requireAccessible(id);
        if (b.getStatus() == Status.REJECTED) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Lượt đã bị từ chối, không thu phí.");
        }
        transactionService.pay(SourceType.AMENITY_BOOKING, b.getId(), method);
        return get(id);
    }

    /** Job: lượt đã duyệt hết giờ → hoàn thành. */
    @Transactional
    public int completeFinished() {
        LocalDateTime now = LocalDateTime.now(clock.withZone(AppTime.ZONE));
        int n = 0;
        for (Long id : bookings.findFinishedIds(now.toLocalDate(), now.toLocalTime())) {
            AmenityBooking b = bookings.findById(id).orElseThrow();
            if (b.getStatus() == Status.APPROVED) {
                b.setStatus(Status.COMPLETED);
                b.setCompletedAt(OffsetDateTime.now(clock));
                n++;
            }
        }
        return n;
    }

    // ---------------------------------------------------------------- Kiểm tra

    private record Checked(Amenity amenity, AmenityConfig config, Apartment apartment, AmenityConfig.Slot slot,
                           BigDecimal unitPrice, AmenityConfig.PriceUnit priceUnit, BigDecimal fee, long remaining) {
    }

    /** {@code lock} = đặt thật: khoá cấu hình tiện ích trước khi đếm chỗ. */
    private Checked check(BookingDtos.Request req, boolean lock) {
        Amenity amenity = amenityService.requireAccessible(req.amenityId());
        if (amenity.getStatus() != ActiveStatus.ACTIVE) {
            throw field("amenityId", "Tiện ích đang ngừng hoạt động.");
        }
        buildingService.requireActive(amenity.getBuildingId(), "Tòa nhà đang không hoạt động, không thể đăng ký tiện ích.");
        AmenityConfig config = (lock ? configs.findForUpdate(amenity.getId()) : configs.findById(amenity.getId()))
                .orElseThrow(() -> field("amenityId", "Tiện ích chưa được cấu hình khung giờ."));

        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        if (!apartment.getBuildingId().equals(amenity.getBuildingId())) {
            throw field("apartmentId", "Căn hộ không thuộc tòa của tiện ích.");
        }
        if (apartment.getStatus() != ActiveStatus.ACTIVE) {
            throw field("apartmentId", "Căn hộ đang không hoạt động.");
        }
        if (req.residentId() != null) {
            Resident resident = residents.findById(req.residentId())
                    .filter(r -> r.getBuildingId().equals(amenity.getBuildingId()))
                    .orElseThrow(() -> field("residentId", "Cư dân không thuộc tòa của tiện ích."));
            if (resident.activeLinks().stream().noneMatch(l -> l.getApartmentId().equals(apartment.getId()))) {
                throw field("residentId", "Cư dân không ở căn hộ đã chọn.");
            }
        }

        LocalDate date = req.bookingDate();
        String closed = closedReason(amenity, config, date, today());
        if (closed != null) {
            throw field("bookingDate", closed);
        }
        AmenityConfig.Slot slot = slotsOf(config, date).stream()
                .filter(s -> s.getStartTime().equals(req.startTime()) && s.getEndTime().equals(req.endTime()))
                .findFirst()
                .orElseThrow(() -> field("startTime", DAY_LABELS[date.getDayOfWeek().getValue()] + " không có khung giờ "
                        + req.startTime() + "–" + req.endTime() + "."));
        if (!LocalDateTime.of(date, slot.getStartTime()).isAfter(LocalDateTime.now(clock.withZone(AppTime.ZONE)))) {
            throw field("startTime", "Khung giờ đã qua.");
        }
        int capacity = capacity(amenity, slot);
        if (req.peopleCount() > capacity) {
            throw field("peopleCount", "Khung giờ chỉ nhận tối đa " + capacity + " người.");
        }
        long booked = bookings.sumPeople(amenity.getId(), date, slot.getStartTime(), slot.getEndTime(), Status.HOLDING);
        long remaining = capacity - booked;
        if (req.peopleCount() > remaining) {
            throw field("peopleCount", remaining <= 0 ? "Khung giờ " + slot.getStartTime() + "–" + slot.getEndTime() + " đã kín chỗ."
                    : "Khung giờ chỉ còn " + remaining + " chỗ.");
        }
        if (config.getMaxBookingsPerWeek() != null) {
            LocalDate monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            long used = bookings.countForApartment(amenity.getId(), apartment.getId(), monday, monday.plusDays(6),
                    Status.HOLDING);
            if (used >= config.getMaxBookingsPerWeek()) {
                throw field("apartmentId", "Căn " + apartment.getCode() + " đã đặt " + used + "/" + config.getMaxBookingsPerWeek()
                        + " lượt " + amenity.getName() + " trong tuần " + monday.format(DAY) + "–" + monday.plusDays(6).format(DAY) + ".");
            }
        }
        Optional<AmenityConfig.Price> price = config.priceFor(date, slot.getStartTime());
        BigDecimal unit = price.map(AmenityConfig.Price::getPrice).orElse(BigDecimal.ZERO);
        AmenityConfig.PriceUnit priceUnit = price.map(AmenityConfig.Price::getPriceUnit).orElse(null);
        BigDecimal fee = priceUnit == AmenityConfig.PriceUnit.PER_PERSON ? unit.multiply(BigDecimal.valueOf(req.peopleCount())) : unit;
        return new Checked(amenity, config, apartment, slot, unit, priceUnit, fee, remaining);
    }

    /** Lý do không nhận đặt ngày đó; null = nhận. */
    private static String closedReason(Amenity amenity, AmenityConfig config, LocalDate date, LocalDate today) {
        if (amenity.getStatus() != ActiveStatus.ACTIVE) {
            return "Tiện ích đang ngừng hoạt động.";
        }
        if (date.isBefore(today)) {
            return "Ngày đã qua.";
        }
        if (date.isAfter(today.plusDays(config.getMaxAdvanceDays()))) {
            return "Chỉ nhận đặt trước tối đa " + config.getMaxAdvanceDays() + " ngày.";
        }
        if (config.isUnderMaintenance(date)) {
            String reason = config.getMaintenances().stream()
                    .filter(m -> !date.isBefore(m.getStartDate()) && !date.isAfter(m.getEndDate()))
                    .map(AmenityConfig.Maintenance::getReason).filter(Objects::nonNull).findFirst().orElse(null);
            return "Tiện ích nghỉ bảo trì ngày " + date.format(DAY) + (reason == null ? "." : ": " + reason + ".");
        }
        if (slotsOf(config, date).isEmpty()) {
            return DAY_LABELS[date.getDayOfWeek().getValue()] + " tiện ích không mở cửa.";
        }
        return null;
    }

    private static List<AmenityConfig.Slot> slotsOf(AmenityConfig config, LocalDate date) {
        int day = date.getDayOfWeek().getValue();
        return config.getSlots().stream().filter(s -> s.getDayOfWeek() == day)
                .sorted(Comparator.comparing(AmenityConfig.Slot::getStartTime)).toList();
    }

    private static int capacity(Amenity amenity, AmenityConfig.Slot slot) {
        return slot.getCapacity() != null ? slot.getCapacity() : amenity.getCapacity();
    }

    /** Voucher có hiệu lực theo ngày sử dụng tiện ích. */
    private static Target target(Checked c, LocalDate usageDate) {
        return new Target(ApplyScope.AMENITY, c.amenity().getId(), c.amenity().getBuildingId(), c.apartment().getId(),
                usageDate);
    }

    // ---------------------------------------------------------------- Helpers

    AmenityBooking requireAccessible(Long id) {
        return bookings.findById(id)
                .filter(b -> buildingService.canAccess(b.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đăng ký tiện ích."));
    }

    private static AmenityBooking requireVersion(AmenityBooking b, Long version) {
        if (version == null || !Objects.equals(b.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        return b;
    }

    private static void requireStatus(AmenityBooking b, Status expected, String action) {
        if (b.getStatus() != expected) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Chỉ " + action + " được lượt đang \"" + (expected == Status.PENDING ? "Chờ duyệt" : "Đã duyệt") + "\".");
        }
    }

    private void decided(AmenityBooking b) {
        b.setDecidedAt(OffsetDateTime.now(clock));
        b.setDecidedBy(CurrentUser.find().map(u -> u.username()).orElse("system"));
    }

    /** Trả voucher, huỷ khoản chưa thu hoặc hoàn khoản đã thu. */
    private void releaseFully(AmenityBooking b) {
        voucherService.release(SourceType.AMENITY_BOOKING, b.getId());
        Optional<FinancialTransaction> tx = transactionService.cancel(SourceType.AMENITY_BOOKING, b.getId());
        if (tx.isPresent() && tx.get().getStatus() == FinancialTransaction.Status.PAID) {
            transactionService.refund(SourceType.AMENITY_BOOKING, b.getId());
        }
    }

    private void notifyApprovers(AmenityBooking b, Amenity amenity, Apartment apartment) {
        List<Long> approvers = users.findHandlers("AMENITY_BOOKING_WRITE", b.getBuildingId(), UserStatus.ACTIVE).stream()
                .filter(u -> u.getBuildingIds().contains(b.getBuildingId()))
                .map(AppUser::getId).toList();
        notificationService.notify(approvers, NotificationType.BOOKING_PENDING,
                "Đăng ký " + amenity.getName() + " chờ duyệt " + b.getCode(),
                "Căn " + apartment.getCode() + " · " + slotText(b) + " · " + b.getPeopleCount() + " người",
                "/amenity-bookings?view=" + b.getId(), b.getBuildingId());
    }

    private static String slotText(AmenityBooking b) {
        return b.getStartTime() + "–" + b.getEndTime() + " " + b.getBookingDate().format(DAY);
    }

    private static LocalDateTime start(AmenityBooking b) {
        return LocalDateTime.of(b.getBookingDate(), b.getStartTime());
    }

    static OffsetDateTime freeCancelUntil(AmenityBooking b, AmenityConfig config) {
        return start(b).minusHours(config.getFreeCancelHours()).atZone(AppTime.ZONE).toOffsetDateTime();
    }

    private TransactionDtos.Summary summary(AmenityBooking b) {
        return transactionService.find(SourceType.AMENITY_BOOKING, b.getId()).map(TransactionService::summary).orElse(null);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(AppTime.ZONE));
    }

    private Specification<AmenityBooking> spec(BookingDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<AmenityBooking>create()
                .likeAny(f.keyword(), "code", "apartment.code", "resident.fullName", "amenity.name")
                .like("code", f.code())
                .eq("amenityId", f.amenityId())
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .eq("residentId", f.residentId())
                .localDateBetween("bookingDate", f.bookingFrom(), f.bookingTo())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(ids -> (Specification<AmenityBooking>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private BookingDtos.Response toResponse(AmenityBooking b, TransactionDtos.Summary tx, AmenityConfig config) {
        return new BookingDtos.Response(b.getId(), b.getBuildingId(), b.getBuilding().getName(), b.getCode(),
                b.getAmenityId(), b.getAmenity().getCode(), b.getAmenity().getName(), b.getApartmentId(),
                b.getApartment().getCode(), b.getResidentId(), b.getResident() == null ? null : b.getResident().getFullName(),
                b.getBookingDate(), b.getStartTime(), b.getEndTime(), b.getPeopleCount(), b.getUnitPrice(), b.getPriceUnit(),
                b.getFee(), b.getVoucherId(), b.getVoucher() == null ? null : b.getVoucher().getCode(), b.getDiscount(),
                b.getTotal(), b.getStatus(), b.getNote(), b.getRejectReason(), b.getCancelReason(), b.getDecidedAt(),
                b.getDecidedBy(), b.getCancelledAt(), b.getCompletedAt(), config == null ? null : freeCancelUntil(b, config),
                tx, b.getCreatedAt(), b.getCreatedBy(), b.getVersion());
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static BusinessException field(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }
}
