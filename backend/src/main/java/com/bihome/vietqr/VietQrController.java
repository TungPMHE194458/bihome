package com.bihome.vietqr;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.vietqr.dto.VietQrDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Thanh toán tự động (VietQR)")
@RestController
@RequiredArgsConstructor
public class VietQrController {

    private final VietQrService vietQrService;
    private final BankWebhookService bankWebhookService;

    @Operation(summary = "Cấu hình VietQR của tòa đang chọn", description = "Chưa cấu hình thì version = null.")
    @GetMapping("/api/v1/vietqr-settings")
    @PreAuthorize("hasAuthority('VIETQR_READ')")
    public VietQrDtos.Response get() {
        return vietQrService.get();
    }

    @Operation(summary = "Lưu cấu hình VietQR")
    @PutMapping("/api/v1/vietqr-settings")
    @PreAuthorize("hasAuthority('VIETQR_WRITE')")
    public VietQrDtos.Response update(@Valid @RequestBody VietQrDtos.Request request) {
        return vietQrService.update(request);
    }

    @Operation(summary = "Giả lập biến động số dư cho một thông báo phí",
            description = "Chỉ khi bật bihome.bank-webhook.simulation-enabled (local / test).")
    @PostMapping("/api/v1/vietqr-settings/simulate")
    @PreAuthorize("hasAuthority('VIETQR_WRITE') and hasAuthority('PAYMENT_WRITE')")
    public VietQrDtos.WebhookResult simulate(@Valid @RequestBody VietQrDtos.SimulateRequest request) {
        return bankWebhookService.simulate(request);
    }

    @Operation(summary = "Biến động số dư đã nhận")
    @GetMapping("/api/v1/bank-transactions")
    @PreAuthorize("hasAuthority('VIETQR_READ')")
    public PageResponse<VietQrDtos.BankTransactionResponse> bankTransactions(
            @ParameterObject VietQrDtos.BankTransactionFilter filter, @ParameterObject PageParams pageParams) {
        return bankWebhookService.list(filter, pageParams);
    }
}
