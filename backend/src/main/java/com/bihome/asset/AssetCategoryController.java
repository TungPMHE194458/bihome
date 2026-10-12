package com.bihome.asset;

import com.bihome.asset.dto.AssetDtos;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Hạng mục căn hộ - Danh mục")
@RestController
@RequestMapping("/api/v1/asset-categories")
@RequiredArgsConstructor
public class AssetCategoryController {

    private final AssetCategoryService service;

    @Operation(summary = "Danh sách danh mục tài sản")
    @GetMapping
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public PageResponse<AssetDtos.CategoryResponse> list(@ParameterObject AssetDtos.CategoryFilter filter,
                                                        @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Danh mục đang hoạt động của một tòa (mặc định tòa đang chọn)")
    @GetMapping("/options")
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public List<AssetDtos.CategoryOption> options(@RequestParam(required = false) Long buildingId) {
        return service.options(buildingId);
    }

    @Operation(summary = "Chi tiết danh mục")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ASSET_READ')")
    public AssetDtos.CategoryResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Thêm danh mục", description = "buildingId bỏ trống = tòa đang chọn ở header.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetDtos.CategoryResponse create(@Valid @RequestBody AssetDtos.CategoryRequest request) {
        return service.create(request);
    }

    @Operation(summary = "Cập nhật danh mục")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetDtos.CategoryResponse update(@PathVariable Long id, @Valid @RequestBody AssetDtos.CategoryRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Đổi trạng thái danh mục")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ASSET_WRITE')")
    public AssetDtos.CategoryResponse changeStatus(@PathVariable Long id, @Valid @RequestBody AssetDtos.ChangeStatus request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá danh mục", description = "409 nếu danh mục đang có hạng mục.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ASSET_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
