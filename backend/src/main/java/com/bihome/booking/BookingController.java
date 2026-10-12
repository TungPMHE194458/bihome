package com.bihome.booking;

import com.bihome.booking.dto.BookingDtos;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.transaction.dto.TransactionDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Đăng ký tiện ích")
@RestController
@RequestMapping("/api/v1/amenity-bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @Operation(summary = "Danh sách đăng ký tiện ích", description = "Phạm vi theo tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_READ')")
    public PageResponse<BookingDtos.Response> list(@ParameterObject BookingDtos.Filter filter,
                                                  @ParameterObject PageParams pageParams) {
        return bookingService.list(filter, pageParams);
    }

    @Operation(summary = "Khung giờ còn trống của tiện ích", description = "days ngày tính từ from (tối đa 31).")
    @GetMapping("/availability")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_READ')")
    public BookingDtos.AvailabilityResponse availability(@RequestParam Long amenityId, @RequestParam LocalDate from,
                                                         @RequestParam(defaultValue = "1") int days) {
        return bookingService.availability(amenityId, from, days);
    }

    @Operation(summary = "Lịch theo tuần của tiện ích", description = "Khung giờ + các lượt đang giữ chỗ từ from trong days ngày.")
    @GetMapping("/calendar")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_READ')")
    public BookingDtos.CalendarResponse calendar(@RequestParam Long amenityId, @RequestParam LocalDate from,
                                                 @RequestParam(defaultValue = "7") int days) {
        return bookingService.calendar(amenityId, from, days);
    }

    @Operation(summary = "Tính thử phí (kèm voucher) trước khi đăng ký")
    @PostMapping("/quote")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.QuoteResponse quote(@Valid @RequestBody BookingDtos.Request request) {
        return bookingService.quote(request);
    }

    @Operation(summary = "Chi tiết đăng ký")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_READ')")
    public BookingDtos.Response get(@PathVariable Long id) {
        return bookingService.get(id);
    }

    @Operation(summary = "Đăng ký tiện ích",
            description = "Kiểm tra khung giờ, sức chứa (khoá bi quan), giới hạn lượt / tuần, voucher; có phí thì sinh giao dịch.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.Response create(@Valid @RequestBody BookingDtos.Request request) {
        return bookingService.create(request);
    }

    @Operation(summary = "Duyệt")
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.Response approve(@PathVariable Long id, @Valid @RequestBody BookingDtos.VersionRequest request) {
        return bookingService.approve(id, request.version());
    }

    @Operation(summary = "Từ chối (bắt buộc lý do)")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.Response reject(@PathVariable Long id, @Valid @RequestBody BookingDtos.ReasonRequest request) {
        return bookingService.reject(id, request);
    }

    @Operation(summary = "Huỷ (bắt buộc lý do)", description = "Trước hạn huỷ miễn phí: trả voucher, huỷ / hoàn khoản phí.")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.Response cancel(@PathVariable Long id, @Valid @RequestBody BookingDtos.ReasonRequest request) {
        return bookingService.cancel(id, request);
    }

    @Operation(summary = "Đánh dấu hoàn thành")
    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.Response complete(@PathVariable Long id, @Valid @RequestBody BookingDtos.VersionRequest request) {
        return bookingService.complete(id, request.version());
    }

    @Operation(summary = "Ghi nhận thanh toán phí")
    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('AMENITY_BOOKING_WRITE')")
    public BookingDtos.Response pay(@PathVariable Long id, @Valid @RequestBody TransactionDtos.PayRequest request) {
        return bookingService.pay(id, request.method());
    }
}
