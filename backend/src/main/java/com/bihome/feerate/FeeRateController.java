package com.bihome.feerate;

import com.bihome.feerate.dto.FeeRateDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Đơn giá thông báo phí")
@RestController
@RequestMapping("/api/v1/fee-rates")
@RequiredArgsConstructor
public class FeeRateController {

    private final FeeRateService feeRateService;

    @Operation(summary = "Đơn giá của tòa đang chọn", description = "Chưa lưu thì trả mặc định với version = null.")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('FEE_NOTICE_READ', 'METER_READING_READ')")
    public FeeRateDtos.Response get() {
        return feeRateService.get();
    }

    @Operation(summary = "Lưu đơn giá (thay toàn bộ)")
    @PutMapping
    @PreAuthorize("hasAuthority('FEE_NOTICE_WRITE')")
    public FeeRateDtos.Response update(@Valid @RequestBody FeeRateDtos.Request request) {
        return feeRateService.update(request);
    }
}
