package com.bihome.residentapp;

import com.bihome.amenity.AmenityService;
import com.bihome.amenity.dto.AmenityDtos;
import com.bihome.booking.BookingService;
import com.bihome.booking.dto.BookingDtos;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.storage.FileService;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.feenotice.FeeNotice;
import com.bihome.feenotice.FeeNoticeService;
import com.bihome.feenotice.dto.FeeNoticeDtos;
import com.bihome.payment.PaymentService;
import com.bihome.payment.dto.PaymentDtos;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentRepository;
import com.bihome.residentapp.dto.ResidentAppDtos;
import com.bihome.setting.SettingService;
import com.bihome.sos.SosAlert;
import com.bihome.sos.SosAlertService;
import com.bihome.sos.dto.SosDtos;
import com.bihome.ticket.TicketCategoryService;
import com.bihome.ticket.TicketEnums.TicketChannel;
import com.bihome.ticket.TicketEnums.TicketPriority;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.ticket.TicketEnums.Visibility;
import com.bihome.ticket.TicketService;
import com.bihome.ticket.dto.TicketDtos;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * API dữ liệu của app cư dân. Mỗi thao tác kiểm tra căn hộ thuộc cư dân ({@link ResidentContext}) rồi gọi lại service
 * của module (chạy dưới người thao tác {@link ResidentSession#actor()}): luật nghiệp vụ, khoá dòng, voucher, giao dịch,
 * thông báo cho BQL giữ nguyên như web. Bản ghi không thuộc cư dân → 404.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentAppService {

    private static final Set<FeeNotice.Status> HIDDEN_NOTICE = Set.of(FeeNotice.Status.DRAFT, FeeNotice.Status.CANCELLED);
    private static final PageParams FIRST_50 = new PageParams(0, 50, null);

    private final ResidentContext context;
    private final ResidentRepository residents;
    private final ResidentInboxService inbox;
    private final FileService fileService;
    private final SettingService settingService;
    private final ResidentAppProperties properties;
    private final FeeNoticeService feeNoticeService;
    private final PaymentService paymentService;
    private final TicketService ticketService;
    private final TicketCategoryService ticketCategoryService;
    private final AmenityService amenityService;
    private final BookingService bookingService;
    private final SosAlertService sosAlertService;
    private final Clock clock;

    // ------------------------------------------------------------ Hồ sơ, trang chủ

    public ResidentAppDtos.AppConfig appConfig() {
        SettingService.Snapshot s = settingService.current();
        return new ResidentAppDtos.AppConfig(properties.minVersion(), s.companyName(), s.hotline(), s.email());
    }

    public ResidentAppDtos.Me me() {
        ResidentSession s = context.current();
        Resident r = residents.findById(s.residentId()).orElseThrow();
        String buildingName = s.apartments().isEmpty() ? null : s.apartments().getFirst().buildingName();
        return new ResidentAppDtos.Me(r.getId(), r.getCode(), r.getFullName(), s.phone(), r.getEmail(),
                r.getAvatarFileId() == null ? null : fileService.urlFor(r.getAvatarFileId()), buildingName,
                s.mustChangePassword(), s.apartments().stream().map(a -> new ResidentAppDtos.Apartment(a.id(), a.code(),
                        a.name(), a.buildingId(), a.buildingName(), a.role(), a.householdHead())).toList());
    }

    public ResidentAppDtos.Home home(Long apartmentId) {
        context.requireApartment(apartmentId);
        List<FeeNoticeDtos.Summary> unpaid = feeNoticeService.list(noticeFilter(apartmentId, true), FIRST_50).content();
        BigDecimal outstanding = unpaid.stream().map(FeeNoticeDtos.Summary::outstanding).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate nearestDue = unpaid.stream().map(FeeNoticeDtos.Summary::dueDate).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(null);
        long openTickets = ticketService.list(ticketFilter(apartmentId), FIRST_50).content().stream()
                .filter(t -> !t.status().isFinal() && t.status() != TicketStatus.DONE).count();
        LocalDate today = LocalDate.now(clock);
        long upcoming = bookingService.list(bookingFilter(apartmentId, today), FIRST_50).content().stream()
                .filter(b -> b.status().isOpen()).count();
        return new ResidentAppDtos.Home(apartmentId, outstanding, unpaid.size(), nearestDue, openTickets, upcoming,
                inbox.unreadCount(context.current().residentId()));
    }

    // ------------------------------------------------------------ Thông báo phí, thanh toán

    public PageResponse<FeeNoticeDtos.Summary> feeNotices(Long apartmentId, PageParams pageParams) {
        context.requireApartment(apartmentId);
        return feeNoticeService.listIssued(apartmentId, pageParams);
    }

    public FeeNoticeDtos.Response feeNotice(Long id) {
        FeeNoticeDtos.Response n = feeNoticeService.get(id);
        if (HIDDEN_NOTICE.contains(n.summary().status())) {
            throw new NotFoundException("Không tìm thấy thông báo phí.");
        }
        context.requireOwned(n.summary().apartmentId(), "Không tìm thấy thông báo phí.");
        return n;
    }

    public FeeNoticeDtos.VietQr feeNoticeQr(Long id) {
        feeNotice(id);
        return feeNoticeService.vietQr(id);
    }

    public byte[] feeNoticePdf(Long id) {
        feeNotice(id);
        return feeNoticeService.pdf(id);
    }

    public String feeNoticePdfName(Long id) {
        return feeNoticeService.pdfFileName(id);
    }

    public PageResponse<PaymentDtos.Response> payments(Long apartmentId, PageParams pageParams) {
        context.requireApartment(apartmentId);
        return paymentService.list(new PaymentDtos.Filter(null, null, null, null, null, apartmentId, null, null, null,
                null, null, null), pageParams);
    }

    // ------------------------------------------------------------ Yêu cầu hỗ trợ

    public List<TicketDtos.CategoryOption> ticketCategories() {
        return ticketCategoryService.options();
    }

    public PageResponse<TicketDtos.Summary> tickets(Long apartmentId, PageParams pageParams) {
        context.requireApartment(apartmentId);
        return ticketService.list(ticketFilter(apartmentId), pageParams);
    }

    public TicketDtos.Response ticket(Long id) {
        TicketDtos.Response t = ticketService.get(id);
        context.requireOwned(t.ticket().apartmentId(), "Không tìm thấy yêu cầu.");
        return t;
    }

    /** Chỉ các mục công khai (bình luận nội bộ của BQL bị ẩn). */
    public List<TicketDtos.TimelineEntry> ticketTimeline(Long id) {
        ticket(id);
        return ticketService.timeline(id).stream().filter(e -> e.visibility() == Visibility.PUBLIC).toList();
    }

    @Transactional
    public TicketDtos.Response createTicket(ResidentAppDtos.TicketCreateRequest req) {
        context.requireApartment(req.apartmentId());
        ResidentSession s = context.current();
        TicketDtos.Request request = new TicketDtos.Request(req.title(), req.description(), req.categoryId(),
                req.apartmentId(), s.residentId(), TicketChannel.APP, TicketPriority.MEDIUM, null, req.fileIds(), null);
        return ticketService.create(request, s.actor());
    }

    @Transactional
    public TicketDtos.TimelineEntry commentTicket(Long id, ResidentAppDtos.TicketCommentRequest req) {
        ticket(id);
        return ticketService.comment(id, new TicketDtos.CommentRequest(req.content(), Visibility.PUBLIC, req.fileIds()),
                context.current().actor());
    }

    @Transactional
    public TicketDtos.Response rateTicket(Long id, ResidentAppDtos.TicketRatingRequest req) {
        ticket(id);
        return ticketService.rate(id, new TicketDtos.RatingRequest(req.rating(), req.comment()));
    }

    // ------------------------------------------------------------ Tiện ích, đặt chỗ

    /** Tiện ích đang hoạt động của tòa có căn hộ. */
    public List<AmenityDtos.Response> amenities(Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        return amenityService.list(new AmenityDtos.Filter(null, a.buildingId(), null, null, null, null, ActiveStatus.ACTIVE,
                null, null), FIRST_50).content();
    }

    public AmenityDtos.Response amenity(Long id, Long apartmentId) {
        ResidentSession.ApartmentRef a = context.requireApartment(apartmentId);
        AmenityDtos.Response amenity = amenityService.get(id);
        if (!amenity.buildingId().equals(a.buildingId()) || amenity.status() != ActiveStatus.ACTIVE) {
            throw new NotFoundException("Không tìm thấy tiện ích.");
        }
        return amenity;
    }

    public BookingDtos.AvailabilityResponse availability(Long amenityId, Long apartmentId, LocalDate from, int days) {
        amenity(amenityId, apartmentId);
        return bookingService.availability(amenityId, from, days);
    }

    public BookingDtos.QuoteResponse quote(ResidentAppDtos.BookingRequest req) {
        amenity(req.amenityId(), req.apartmentId());
        return bookingService.quote(toBookingRequest(req));
    }

    @Transactional
    public BookingDtos.Response book(ResidentAppDtos.BookingRequest req) {
        amenity(req.amenityId(), req.apartmentId());
        return bookingService.create(toBookingRequest(req));
    }

    public PageResponse<BookingDtos.Response> bookings(Long apartmentId, PageParams pageParams) {
        context.requireApartment(apartmentId);
        return bookingService.list(bookingFilter(apartmentId, null), pageParams);
    }

    public BookingDtos.Response booking(Long id) {
        BookingDtos.Response b = bookingService.get(id);
        context.requireOwned(b.apartmentId(), "Không tìm thấy lượt đặt.");
        return b;
    }

    @Transactional
    public BookingDtos.Response cancelBooking(Long id, ResidentAppDtos.CancelRequest req) {
        booking(id);
        return bookingService.cancel(id, new BookingDtos.ReasonRequest(req.reason(), req.version()));
    }

    // ------------------------------------------------------------ SOS

    @Transactional
    public SosDtos.Response sos(ResidentAppDtos.SosRequest req) {
        context.requireApartment(req.apartmentId());
        ResidentSession s = context.current();
        return sosAlertService.create(new SosDtos.CreateRequest(req.alertType(), req.apartmentId(), s.fullName(), s.phone(),
                null, req.description()), SosAlert.Source.APP);
    }

    // ------------------------------------------------------------ Bộ lọc

    private static FeeNoticeDtos.Filter noticeFilter(Long apartmentId, Boolean unpaid) {
        return new FeeNoticeDtos.Filter(null, null, null, null, apartmentId, null, null, unpaid, null, null);
    }

    private static TicketDtos.Filter ticketFilter(Long apartmentId) {
        return new TicketDtos.Filter(null, null, null, null, null, apartmentId, null, null, null, null, null, null, null,
                null, null, null, null, null);
    }

    private static BookingDtos.Filter bookingFilter(Long apartmentId, LocalDate from) {
        return new BookingDtos.Filter(null, null, null, null, apartmentId, null, null, from, null,
                null, null, null);
    }

    private BookingDtos.Request toBookingRequest(ResidentAppDtos.BookingRequest req) {
        return new BookingDtos.Request(req.amenityId(), req.apartmentId(), context.current().residentId(), req.bookingDate(),
                req.startTime(), req.endTime(), req.peopleCount(), req.voucherCode(), req.note());
    }
}
