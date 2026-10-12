package com.bihome.vietqr;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.vietqr.dto.VietQrDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Webhook ngân hàng (không cần đăng nhập): xác thực bằng header {@value #SECRET_HEADER} so với
 * {@code bihome.bank-webhook.secret}; chưa cấu hình secret thì từ chối mọi yêu cầu. Gửi lại cùng mã tham chiếu trả
 * DUPLICATE (an toàn khi ngân hàng retry).
 */
@Tag(name = "Thanh toán tự động (VietQR)")
@RestController
public class BankWebhookController {

    public static final String SECRET_HEADER = "X-Webhook-Secret";

    private final BankWebhookService bankWebhookService;
    private final byte[] secret;

    public BankWebhookController(BankWebhookService bankWebhookService,
                                 @Value("${bihome.bank-webhook.secret:}") String secret) {
        this.bankWebhookService = bankWebhookService;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Operation(summary = "Nhận biến động số dư", description = "Header " + SECRET_HEADER + " bắt buộc.")
    @PostMapping("/api/v1/webhooks/bank")
    public VietQrDtos.WebhookResult receive(@RequestHeader(value = SECRET_HEADER, required = false) String header,
                                           @Valid @RequestBody VietQrDtos.WebhookEvent event) {
        if (secret.length == 0 || header == null
                || !MessageDigest.isEqual(secret, header.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Webhook không hợp lệ.");
        }
        return bankWebhookService.receive(event, false);
    }
}
