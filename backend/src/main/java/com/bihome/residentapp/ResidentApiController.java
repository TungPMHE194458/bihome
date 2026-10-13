package com.bihome.residentapp;

import com.bihome.amenity.dto.AmenityDtos;
import com.bihome.booking.dto.BookingDtos;
import com.bihome.common.pdf.PdfResponses;
import com.bihome.common.storage.FileContentResponses;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileResponse;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.feenotice.dto.FeeNoticeDtos;
import com.bihome.payment.dto.PaymentDtos;
import com.bihome.residentapp.dto.ResidentAppDtos;
import com.bihome.residentapp.dto.ResidentAuthDtos;
import com.bihome.sos.dto.SosDtos;
import com.bihome.ticket.dto.TicketDtos;
import com.bihome.vietqr.QrImages;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API dữ liệu của app cư dân (token cư dân). Danh sách luôn theo một căn ({@code apartmentId} là căn cư dân đang ở);
 * bản ghi không thuộc cư dân trả 404.
 */
@Tag(name = "App cư dân")
@RestController
@RequestMapping(ResidentSecurityConfig.PREFIX)
@RequiredArgsConstructor
public class ResidentApiController {

    private final ResidentAppService app;
    private final ResidentAuthService authService;
    private final ResidentInboxService inbox;
    private final ResidentFileService files;
    private final ResidentContext context;

    // ------------------------------------------------------------ Chung

    @Operation(summary = "Cấu hình app", description = "Không cần đăng nhập. minVersion: app cũ hơn phải cập nhật.")
    @GetMapping("/app-config")
    public ResidentAppDtos.AppConfig appConfig() {
        return app.appConfig();
    }

    @Operation(summary = "Thông tin cư dân và các căn đang ở")
    @GetMapping("/me")
    public ResidentAppDtos.Me me() {
        return app.me();
    }

    @Operation(summary = "Xoá tài khoản app", description = "Cần nhập lại mật khẩu. Hồ sơ cư trú do BQL quản lý vẫn giữ.")
    @PostMapping("/me/delete-account")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@Valid @RequestBody ResidentAuthDtos.DeleteAccountRequest request) {
        authService.deleteAccount(context.current().accountId(), request.password());
    }

    @Operation(summary = "Số liệu trang chủ của một căn")
    @GetMapping("/home")
    public ResidentAppDtos.Home home(@RequestParam Long apartmentId) {
        return app.home(apartmentId);
    }

    @Operation(summary = "Đăng ký push token (Expo) của thiết bị")
    @PostMapping("/push-tokens")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registerPushToken(@Valid @RequestBody ResidentAppDtos.PushTokenRequest request) {
        authService.registerPushToken(context.current().accountId(), request);
    }

    @DeleteMapping("/push-tokens/{token}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregisterPushToken(@PathVariable String token) {
        authService.unregisterPushToken(context.current().accountId(), token);
    }

    // ------------------------------------------------------------ Hộp thư

    @GetMapping("/inbox")
    public PageResponse<ResidentAppDtos.InboxItem> inbox(@RequestParam(defaultValue = "false") boolean unreadOnly,
                                                         @ParameterObject PageParams pageParams) {
        return inbox.list(context.current().residentId(), unreadOnly, pageParams);
    }

    @GetMapping("/inbox/unread-count")
    public ResidentAppDtos.UnreadCount unreadCount() {
        return new ResidentAppDtos.UnreadCount(inbox.unreadCount(context.current().residentId()));
    }

    @PostMapping("/inbox/{id}/read")
    public ResidentAppDtos.InboxItem markRead(@PathVariable Long id) {
        return inbox.markRead(context.current().residentId(), id);
    }

    @PostMapping("/inbox/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        inbox.markAllRead(context.current().residentId());
    }

    // ------------------------------------------------------------ Thông báo phí, thanh toán

    @Operation(summary = "Thông báo phí đã phát hành của căn", description = "Kỳ mới nhất trước.")
    @GetMapping("/fee-notices")
    public PageResponse<FeeNoticeDtos.Summary> feeNotices(@RequestParam Long apartmentId,
                                                         @ParameterObject PageParams pageParams) {
        return app.feeNotices(apartmentId, pageParams);
    }

    @GetMapping("/fee-notices/{id}")
    public FeeNoticeDtos.Response feeNotice(@PathVariable Long id) {
        return app.feeNotice(id);
    }

    @Operation(summary = "Chuỗi VietQR cho số còn nợ", description = "App tự vẽ mã QR từ payload.")
    @GetMapping("/fee-notices/{id}/vietqr")
    public FeeNoticeDtos.VietQr feeNoticeQr(@PathVariable Long id) {
        return app.feeNoticeQr(id);
    }

    @Operation(summary = "Ảnh mã VietQR (PNG) cho số còn nợ")
    @GetMapping("/fee-notices/{id}/vietqr.png")
    public ResponseEntity<byte[]> feeNoticeQrImage(@PathVariable Long id) {
        return PdfResponses.png(QrImages.png(app.feeNoticeQr(id).payload(), 480));
    }

    @GetMapping("/fee-notices/{id}/pdf")
    public ResponseEntity<byte[]> feeNoticePdf(@PathVariable Long id) {
        byte[] pdf = app.feeNoticePdf(id);
        return PdfResponses.inline(pdf, app.feeNoticePdfName(id));
    }

    @GetMapping("/payments")
    public PageResponse<PaymentDtos.Response> payments(@RequestParam Long apartmentId,
                                                      @ParameterObject PageParams pageParams) {
        return app.payments(apartmentId, pageParams);
    }

    // ------------------------------------------------------------ Yêu cầu hỗ trợ

    @GetMapping("/ticket-categories")
    public List<TicketDtos.CategoryOption> ticketCategories() {
        return app.ticketCategories();
    }

    @GetMapping("/tickets")
    public PageResponse<TicketDtos.Summary> tickets(@RequestParam Long apartmentId, @ParameterObject PageParams pageParams) {
        return app.tickets(apartmentId, pageParams);
    }

    @GetMapping("/tickets/{id}")
    public TicketDtos.Response ticket(@PathVariable Long id) {
        return app.ticket(id);
    }

    @Operation(summary = "Dòng thời gian công khai của yêu cầu")
    @GetMapping("/tickets/{id}/timeline")
    public List<TicketDtos.TimelineEntry> timeline(@PathVariable Long id) {
        return app.ticketTimeline(id);
    }

    @Operation(summary = "Gửi yêu cầu", description = "Ảnh tải trước qua POST /resident/files (purpose TICKET_ATTACHMENT).")
    @PostMapping("/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDtos.Response createTicket(@Valid @RequestBody ResidentAppDtos.TicketCreateRequest request) {
        return app.createTicket(request);
    }

    @PostMapping("/tickets/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDtos.TimelineEntry comment(@PathVariable Long id,
                                            @Valid @RequestBody ResidentAppDtos.TicketCommentRequest request) {
        return app.commentTicket(id, request);
    }

    @Operation(summary = "Đánh giá yêu cầu đã hoàn thành")
    @PostMapping("/tickets/{id}/rating")
    public TicketDtos.Response rate(@PathVariable Long id, @Valid @RequestBody ResidentAppDtos.TicketRatingRequest request) {
        return app.rateTicket(id, request);
    }

    // ------------------------------------------------------------ Tiện ích, đặt chỗ

    @GetMapping("/amenities")
    public List<AmenityDtos.Response> amenities(@RequestParam Long apartmentId) {
        return app.amenities(apartmentId);
    }

    @GetMapping("/amenities/{id}")
    public AmenityDtos.Response amenity(@PathVariable Long id, @RequestParam Long apartmentId) {
        return app.amenity(id, apartmentId);
    }

    @Operation(summary = "Khung giờ còn trống theo ngày")
    @GetMapping("/amenities/{id}/availability")
    public BookingDtos.AvailabilityResponse availability(@PathVariable Long id, @RequestParam Long apartmentId,
                                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                         @RequestParam(defaultValue = "7") int days) {
        return app.availability(id, apartmentId, from, days);
    }

    @Operation(summary = "Tính thử phí lượt đặt (kèm voucher)")
    @PostMapping("/bookings/quote")
    public BookingDtos.QuoteResponse quote(@Valid @RequestBody ResidentAppDtos.BookingRequest request) {
        return app.quote(request);
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDtos.Response book(@Valid @RequestBody ResidentAppDtos.BookingRequest request) {
        return app.book(request);
    }

    @GetMapping("/bookings")
    public PageResponse<BookingDtos.Response> bookings(@RequestParam Long apartmentId, @ParameterObject PageParams pageParams) {
        return app.bookings(apartmentId, pageParams);
    }

    @GetMapping("/bookings/{id}")
    public BookingDtos.Response booking(@PathVariable Long id) {
        return app.booking(id);
    }

    @PostMapping("/bookings/{id}/cancel")
    public BookingDtos.Response cancelBooking(@PathVariable Long id, @Valid @RequestBody ResidentAppDtos.CancelRequest request) {
        return app.cancelBooking(id, request);
    }

    // ------------------------------------------------------------ SOS

    @Operation(summary = "Gửi cảnh báo khẩn cấp", description = "BQL nhận cảnh báo (nút SOS ở web) kèm căn hộ và SĐT cư dân.")
    @PostMapping("/sos")
    @ResponseStatus(HttpStatus.CREATED)
    public SosDtos.Response sos(@Valid @RequestBody ResidentAppDtos.SosRequest request) {
        return app.sos(request);
    }

    // ------------------------------------------------------------ Tệp

    @Operation(summary = "Tải ảnh lên", description = "TICKET_ATTACHMENT (đính kèm yêu cầu) hoặc RESIDENT_AVATAR (ảnh thành viên khi kê khai); ảnh ≤ 5MB.")
    @PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(@RequestParam("file") MultipartFile file,
                                               @RequestParam(defaultValue = "TICKET_ATTACHMENT") FilePurpose purpose) {
        return ResponseEntity.status(HttpStatus.CREATED).body(files.upload(file, purpose));
    }

    @Operation(summary = "Xem tệp", description = "Thay cho /api/v1/files/{id} trong dữ liệu trả về.")
    @GetMapping("/files/{id}")
    public ResponseEntity<Resource> file(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean download) {
        return FileContentResponses.of(files.get(id), download);
    }
}
