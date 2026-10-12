package com.bihome.servicecatalog;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.servicecatalog.dto.ServiceOrderDtos;
import com.bihome.transaction.dto.TransactionDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dịch vụ")
@RestController
@RequestMapping("/api/v1/service-orders")
@RequiredArgsConstructor
public class ServiceOrderController {

    private final ServiceOrderService orderService;

    @Operation(summary = "Đơn dịch vụ", description = "Phạm vi theo tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public PageResponse<ServiceOrderDtos.Response> list(@ParameterObject ServiceOrderDtos.Filter filter,
                                                       @ParameterObject PageParams pageParams) {
        return orderService.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết đơn dịch vụ")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public ServiceOrderDtos.Response get(@PathVariable Long id) {
        return orderService.get(id);
    }

    @Operation(summary = "Tính thử thành tiền (kèm voucher)")
    @PostMapping("/quote")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceOrderDtos.QuoteResponse quote(@Valid @RequestBody ServiceOrderDtos.Request request) {
        return orderService.quote(request);
    }

    @Operation(summary = "Tạo đơn dịch vụ cho căn hộ", description = "Sinh giao dịch chưa thanh toán nếu thành tiền > 0.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceOrderDtos.Response create(@Valid @RequestBody ServiceOrderDtos.Request request) {
        return orderService.create(request);
    }

    @Operation(summary = "Xác nhận đơn")
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceOrderDtos.Response confirm(@PathVariable Long id, @Valid @RequestBody ServiceOrderDtos.StatusRequest request) {
        return orderService.confirm(id, request.version());
    }

    @Operation(summary = "Hoàn thành đơn")
    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceOrderDtos.Response complete(@PathVariable Long id, @Valid @RequestBody ServiceOrderDtos.StatusRequest request) {
        return orderService.complete(id, request.version());
    }

    @Operation(summary = "Huỷ đơn (bắt buộc lý do)")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceOrderDtos.Response cancel(@PathVariable Long id, @Valid @RequestBody ServiceOrderDtos.CancelRequest request) {
        return orderService.cancel(id, request);
    }

    @Operation(summary = "Ghi nhận thanh toán")
    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceOrderDtos.Response pay(@PathVariable Long id, @Valid @RequestBody TransactionDtos.PayRequest request) {
        return orderService.pay(id, request.method());
    }
}
