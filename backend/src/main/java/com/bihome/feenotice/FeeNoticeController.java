package com.bihome.feenotice;

import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.pdf.PdfResponses;
import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.feenotice.dto.FeeNoticeDtos;
import com.bihome.vietqr.QrImages;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Thông báo phí")
@RestController
@RequestMapping("/api/v1/fee-notices")
@RequiredArgsConstructor
public class FeeNoticeController {

    private final FeeNoticeService feeNoticeService;

    @Operation(summary = "Danh sách thông báo phí", description = "unpaid = true: còn nợ (đã phát hành, chưa thu đủ).")
    @GetMapping
    @PreAuthorize("hasAuthority('FEE_NOTICE_READ')")
    public PageResponse<FeeNoticeDtos.Summary> list(@ParameterObject FeeNoticeDtos.Filter filter,
                                                   @ParameterObject PageParams pageParams) {
        return feeNoticeService.list(filter, pageParams);
    }

    @Operation(summary = "Xuất Excel danh sách thông báo phí (kèm chi tiết khoản)")
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('FEE_NOTICE_EXPORT')")
    public ResponseEntity<byte[]> export(@ParameterObject FeeNoticeDtos.Filter filter) {
        return ExcelResponses.attachment(feeNoticeService.export(filter), feeNoticeService.exportFileName(filter));
    }

    @Operation(summary = "Xem trước tạo hàng loạt", description = "Tính phí cho các căn của tòa đang chọn, chưa lưu gì.")
    @PostMapping("/preview")
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.Preview preview(@Valid @RequestBody FeeNoticeDtos.GenerateRequest request) {
        return feeNoticeService.preview(request);
    }

    @Operation(summary = "Tạo hàng loạt (nháp)", description = "Bỏ qua căn đã có thông báo kỳ này hoặc không có khoản nào.")
    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.GenerateResult generate(@Valid @RequestBody FeeNoticeDtos.GenerateRequest request) {
        return feeNoticeService.generate(request);
    }

    @Operation(summary = "Phát hành mọi thông báo nháp của kỳ (tòa đang chọn)")
    @PostMapping("/issue-all")
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.IssueAllResult issueAll(@Valid @RequestBody FeeNoticeDtos.IssueAllRequest request,
                                                @AuthenticationPrincipal AuthUser actor) {
        return feeNoticeService.issueAll(request.period(), actor);
    }

    @Operation(summary = "Chi tiết thông báo phí")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FEE_NOTICE_READ')")
    public FeeNoticeDtos.Response get(@PathVariable Long id) {
        return feeNoticeService.get(id);
    }

    @Operation(summary = "PDF thông báo phí (có mã VietQR)")
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAuthority('FEE_NOTICE_READ')")
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) {
        return PdfResponses.inline(feeNoticeService.pdf(id), feeNoticeService.pdfFileName(id));
    }

    @Operation(summary = "Chuỗi VietQR (EMVCo) cho số còn nợ")
    @GetMapping("/{id}/vietqr")
    @PreAuthorize("hasAuthority('FEE_NOTICE_READ')")
    public FeeNoticeDtos.VietQr vietQr(@PathVariable Long id) {
        return feeNoticeService.vietQr(id);
    }

    @Operation(summary = "Ảnh mã VietQR (PNG)")
    @GetMapping("/{id}/vietqr.png")
    @PreAuthorize("hasAuthority('FEE_NOTICE_READ')")
    public ResponseEntity<byte[]> vietQrImage(@PathVariable Long id) {
        return PdfResponses.png(QrImages.png(feeNoticeService.vietQr(id).payload(), 320));
    }

    @Operation(summary = "Sửa thông báo nháp", description = "VAT tính lại; dòng tiện ích / nợ kỳ trước chỉ được bỏ.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.Response update(@PathVariable Long id, @Valid @RequestBody FeeNoticeDtos.UpdateRequest request) {
        return feeNoticeService.update(id, request);
    }

    @Operation(summary = "Tính lại nháp theo số liệu / đơn giá hiện tại", description = "Giữ dòng giảm trừ.")
    @PostMapping("/{id}/recalculate")
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.Response recalculate(@PathVariable Long id, @Valid @RequestBody FeeNoticeDtos.VersionRequest request) {
        return feeNoticeService.recalculate(id, request.version());
    }

    @Operation(summary = "Phát hành", description = "Khoá số liệu kỳ của căn, chuyển nợ kỳ trước, gửi thông báo cho cư dân.")
    @PostMapping("/{id}/issue")
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.Response issue(@PathVariable Long id, @Valid @RequestBody FeeNoticeDtos.VersionRequest request,
                                       @AuthenticationPrincipal AuthUser actor) {
        return feeNoticeService.issue(id, request.version(), actor);
    }

    @Operation(summary = "Huỷ thông báo đã phát hành (chưa có phiếu thu)")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeNoticeDtos.Response cancel(@PathVariable Long id, @Valid @RequestBody FeeNoticeDtos.CancelRequest request) {
        return feeNoticeService.cancel(id, request);
    }

    @Operation(summary = "Xoá thông báo nháp")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('FEE_NOTICE_DELETE')")
    public void delete(@PathVariable Long id) {
        feeNoticeService.delete(id);
    }
}
