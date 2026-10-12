package com.bihome.voucher;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.voucher.dto.VoucherDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Voucher")
@RestController
@RequestMapping("/api/v1/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService service;

    @Operation(summary = "Danh sách voucher",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id. validity: UPCOMING | VALID | EXPIRED.")
    @GetMapping
    @PreAuthorize("hasAuthority('VOUCHER_READ')")
    public PageResponse<VoucherDtos.Response> list(@ParameterObject VoucherDtos.Filter filter,
                                                  @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết voucher")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('VOUCHER_READ')")
    public VoucherDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Thêm voucher vào tòa đang chọn")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('VOUCHER_WRITE')")
    public VoucherDtos.Response create(@Valid @RequestBody VoucherDtos.Request request) {
        return service.create(request);
    }

    @Operation(summary = "Cập nhật voucher", description = "Đã có lượt dùng thì không sửa được loại / giá trị giảm, phạm vi, mã.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('VOUCHER_WRITE')")
    public VoucherDtos.Response update(@PathVariable Long id, @Valid @RequestBody VoucherDtos.Request request) {
        return service.update(id, request);
    }

    @Operation(summary = "Đổi trạng thái voucher")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('VOUCHER_WRITE')")
    public VoucherDtos.Response changeStatus(@PathVariable Long id, @Valid @RequestBody VoucherDtos.ChangeStatus request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá voucher", description = "Chỉ voucher chưa có lượt dùng.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('VOUCHER_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
