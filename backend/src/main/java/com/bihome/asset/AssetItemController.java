package com.bihome.asset;

import com.bihome.asset.dto.AssetDtos;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
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

@Tag(name = "Hạng mục căn hộ - Hạng mục")
@RestController
@RequestMapping("/api/v1/asset-items")
@RequiredArgsConstructor
public class AssetItemController {

    private final AssetItemService service;

    @Operation(summary = "Danh sách hạng mục (xe...)", description = "Lọc theo apartmentId để xem hạng mục của một căn hộ.")
    @GetMapping
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public PageResponse<AssetDtos.ItemResponse> list(@ParameterObject AssetDtos.ItemFilter filter,
                                                    @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết hạng mục")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public AssetDtos.ItemResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Thêm hạng mục", description = "Tòa nhà lấy theo căn hộ; ngày ra ≤ hôm nay → tự chuyển Không hoạt động.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetDtos.ItemResponse create(@Valid @RequestBody AssetDtos.ItemRequest request) {
        return service.create(request);
    }

    @Operation(summary = "Cập nhật hạng mục")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetDtos.ItemResponse update(@PathVariable Long id, @Valid @RequestBody AssetDtos.ItemRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Đổi trạng thái hạng mục")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetDtos.ItemResponse changeStatus(@PathVariable Long id, @Valid @RequestBody AssetDtos.ChangeStatus request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá hạng mục")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ASSET_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
