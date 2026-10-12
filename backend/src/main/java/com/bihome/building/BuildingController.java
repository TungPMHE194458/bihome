package com.bihome.building;

import com.bihome.building.dto.BuildingDtos;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Tòa nhà")
@RestController
@RequestMapping("/api/v1/buildings")
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;

    @Operation(summary = "Danh sách tòa nhà",
            description = "Không lọc theo X-Building-Id; user không phải Admin hệ thống chỉ thấy tòa được gán.")
    @GetMapping
    @PreAuthorize("hasAuthority('BUILDING_READ')")
    public PageResponse<BuildingDtos.Summary> list(@ParameterObject BuildingDtos.Filter filter,
                                                  @ParameterObject PageParams pageParams) {
        return buildingService.list(filter, pageParams);
    }

    @Operation(summary = "Danh sách rút gọn cho bộ chọn tòa nhà",
            description = "Admin hệ thống: mọi tòa; người khác: tòa được gán đang hoạt động.")
    @GetMapping("/options")
    public List<BuildingDtos.Option> options() {
        return buildingService.options();
    }

    @Operation(summary = "Chi tiết tòa nhà")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BUILDING_READ')")
    public BuildingDtos.Response get(@PathVariable Long id) {
        return buildingService.get(id);
    }

    @Operation(summary = "Thêm tòa nhà", description = "Tải ảnh lên /files (purpose=BUILDING_IMAGE) trước rồi gửi danh sách fileId.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('BUILDING_WRITE')")
    public BuildingDtos.Response create(@Valid @RequestBody BuildingDtos.Request request,
                                        @AuthenticationPrincipal AuthUser actor) {
        return buildingService.create(request, actor);
    }

    @Operation(summary = "Cập nhật tòa nhà")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BUILDING_WRITE')")
    public BuildingDtos.Response update(@PathVariable Long id, @Valid @RequestBody BuildingDtos.Request request,
                                        @AuthenticationPrincipal AuthUser actor) {
        return buildingService.update(id, request, actor);
    }

    @Operation(summary = "Đổi trạng thái tòa nhà")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('BUILDING_WRITE')")
    public BuildingDtos.Response changeStatus(@PathVariable Long id,
                                              @Valid @RequestBody BuildingDtos.ChangeStatus request) {
        return buildingService.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá tòa nhà")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('BUILDING_DELETE')")
    public void delete(@PathVariable Long id) {
        buildingService.delete(id);
    }
}
