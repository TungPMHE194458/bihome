package com.bihome.declaration;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.declaration.dto.DeclarationDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Web BQL: duyệt phiếu kê khai thành viên / xe gửi từ app cư dân. */
@Tag(name = "Kê khai từ cư dân")
@RestController
@RequestMapping("/api/v1/declarations")
@RequiredArgsConstructor
public class DeclarationController {

    private final DeclarationService service;

    @Operation(summary = "Danh sách phiếu kê khai", description = "Lọc theo loại, trạng thái, căn hộ; phạm vi tòa như các danh sách khác.")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('RESIDENT_READ', 'ASSET_READ')")
    public PageResponse<DeclarationDtos.Response> list(@ParameterObject DeclarationDtos.Filter filter,
                                                       @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('RESIDENT_READ', 'ASSET_READ')")
    public DeclarationDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Duyệt",
            description = "Thành viên (cần RESIDENT_WRITE): tạo cư dân, hoặc gắn cư dân sẵn có cùng SĐT trong tòa vào căn. "
                    + "Xe (cần ASSET_WRITE): tạo hạng mục căn hộ. Trường gửi kèm là bản BQL đã soát lại.")
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('RESIDENT_WRITE', 'ASSET_WRITE')")
    public DeclarationDtos.Response approve(@PathVariable Long id, @Valid @RequestBody DeclarationDtos.ApproveRequest request) {
        return service.approve(id, request);
    }

    @Operation(summary = "Từ chối", description = "Bắt buộc lý do; báo về app của người gửi.")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('RESIDENT_WRITE', 'ASSET_WRITE')")
    public DeclarationDtos.Response reject(@PathVariable Long id, @Valid @RequestBody DeclarationDtos.RejectRequest request) {
        return service.reject(id, request);
    }
}
