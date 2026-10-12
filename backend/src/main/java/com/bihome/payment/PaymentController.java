package com.bihome.payment;

import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.pdf.PdfResponses;
import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.payment.dto.PaymentDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Lịch sử thanh toán")
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Danh sách phiếu thu")
    @GetMapping
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public PageResponse<PaymentDtos.Response> list(@ParameterObject PaymentDtos.Filter filter,
                                                  @ParameterObject PageParams pageParams) {
        return paymentService.list(filter, pageParams);
    }

    @Operation(summary = "Xuất Excel phiếu thu")
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('PAYMENT_EXPORT')")
    public ResponseEntity<byte[]> export(@ParameterObject PaymentDtos.Filter filter) {
        return ExcelResponses.attachment(paymentService.export(filter), paymentService.exportFileName(filter));
    }

    @Operation(summary = "Chi tiết phiếu thu")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public PaymentDtos.Response get(@PathVariable Long id) {
        return paymentService.get(id);
    }

    @Operation(summary = "In phiếu thu (PDF)")
    @GetMapping("/{id}/receipt")
    @PreAuthorize("hasAuthority('PAYMENT_READ')")
    public ResponseEntity<byte[]> receipt(@PathVariable Long id) {
        return PdfResponses.inline(paymentService.receipt(id), paymentService.receiptFileName(id));
    }

    @Operation(summary = "Ghi nhận thanh toán thủ công", description = "Cho phép trả một phần; không vượt số còn nợ.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PAYMENT_WRITE')")
    public PaymentDtos.Response create(@Valid @RequestBody PaymentDtos.CreateRequest request,
                                      @AuthenticationPrincipal AuthUser actor) {
        return paymentService.create(request, actor);
    }

    @Operation(summary = "Đối soát phiếu chuyển khoản")
    @PostMapping("/{id}/reconcile")
    @PreAuthorize("hasAuthority('PAYMENT_WRITE')")
    public PaymentDtos.Response reconcile(@PathVariable Long id, @Valid @RequestBody PaymentDtos.ReconcileRequest request) {
        return paymentService.reconcile(id, request);
    }

    @Operation(summary = "Huỷ phiếu thu (cần lý do)")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('PAYMENT_WRITE')")
    public PaymentDtos.Response cancel(@PathVariable Long id, @Valid @RequestBody PaymentDtos.CancelRequest request,
                                      @AuthenticationPrincipal AuthUser actor) {
        return paymentService.cancel(id, request, actor);
    }
}
