package com.bihome.amenity;

import com.bihome.amenity.dto.AmenityDtos;
import com.bihome.common.security.AuthUser;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

@Tag(name = "Tiện ích")
@RestController
@RequestMapping("/api/v1/amenities")
@RequiredArgsConstructor
public class AmenityController {

    private final AmenityService service;

    @Operation(summary = "Danh sách tiện ích",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập.")
    @GetMapping
    @PreAuthorize("hasAuthority('AMENITY_READ')")
    public PageResponse<AmenityDtos.Response> list(@ParameterObject AmenityDtos.Filter filter,
                                                  @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Tiện ích đang hoạt động của một tòa (mặc định tòa đang chọn)")
    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('AMENITY_READ', 'VOUCHER_WRITE', 'AMENITY_BOOKING_READ')")
    public List<AmenityDtos.Option> options(@RequestParam(required = false) Long buildingId) {
        return service.options(buildingId);
    }

    @Operation(summary = "Chi tiết tiện ích")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('AMENITY_READ')")
    public AmenityDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Thêm tiện ích vào tòa đang chọn", description = "Tạo kèm cấu hình mặc định (chưa có khung giờ).")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('AMENITY_WRITE')")
    public AmenityDtos.Response create(@Valid @RequestBody AmenityDtos.Request request,
                                      @AuthenticationPrincipal AuthUser actor) {
        return service.create(request, actor);
    }

    @Operation(summary = "Cập nhật tiện ích")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('AMENITY_WRITE')")
    public AmenityDtos.Response update(@PathVariable Long id, @Valid @RequestBody AmenityDtos.Request request,
                                      @AuthenticationPrincipal AuthUser actor) {
        return service.update(id, request, actor);
    }

    @Operation(summary = "Đổi trạng thái tiện ích")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('AMENITY_WRITE')")
    public AmenityDtos.Response changeStatus(@PathVariable Long id, @Valid @RequestBody AmenityDtos.ChangeStatus request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá tiện ích", description = "409 nếu voucher còn chỉ định tiện ích.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('AMENITY_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @Operation(summary = "Cấu hình đặt chỗ của tiện ích")
    @GetMapping("/{id}/config")
    @PreAuthorize("hasAuthority('AMENITY_READ')")
    public AmenityDtos.ConfigResponse getConfig(@PathVariable Long id) {
        return service.getConfig(id);
    }

    @Operation(summary = "Lưu cấu hình đặt chỗ", description = "Thay toàn bộ khung giờ, mức giá và ngày bảo trì.")
    @PutMapping("/{id}/config")
    @PreAuthorize("hasAuthority('AMENITY_WRITE')")
    public AmenityDtos.ConfigResponse updateConfig(@PathVariable Long id,
                                                   @Valid @RequestBody AmenityDtos.ConfigRequest request) {
        return service.updateConfig(id, request);
    }
}
