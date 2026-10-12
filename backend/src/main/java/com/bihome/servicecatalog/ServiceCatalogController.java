package com.bihome.servicecatalog;

import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.servicecatalog.dto.ServiceDtos;
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

/** Loại dịch vụ (/service-types, dùng chung mọi tòa) và Dịch vụ (/services, theo tòa). */
@Tag(name = "Dịch vụ")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ServiceCatalogController {

    private final ServiceTypeService typeService;
    private final ServiceOfferingService serviceService;

    // ---------- Loại dịch vụ ----------

    @Operation(summary = "Danh sách loại dịch vụ")
    @GetMapping("/service-types")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public PageResponse<ServiceDtos.TypeResponse> types(@ParameterObject ServiceDtos.TypeFilter filter,
                                                       @ParameterObject PageParams pageParams) {
        return typeService.list(filter, pageParams);
    }

    @Operation(summary = "Loại dịch vụ đang hoạt động cho ô chọn")
    @GetMapping("/service-types/options")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public List<ServiceDtos.TypeOption> typeOptions() {
        return typeService.options();
    }

    @Operation(summary = "Chi tiết loại dịch vụ")
    @GetMapping("/service-types/{id}")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public ServiceDtos.TypeResponse type(@PathVariable Long id) {
        return typeService.get(id);
    }

    @Operation(summary = "Thêm loại dịch vụ")
    @PostMapping("/service-types")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceDtos.TypeResponse createType(@Valid @RequestBody ServiceDtos.TypeRequest request) {
        return typeService.create(request);
    }

    @Operation(summary = "Cập nhật loại dịch vụ")
    @PutMapping("/service-types/{id}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceDtos.TypeResponse updateType(@PathVariable Long id, @Valid @RequestBody ServiceDtos.TypeRequest request) {
        return typeService.update(id, request);
    }

    @Operation(summary = "Đổi trạng thái loại dịch vụ")
    @PatchMapping("/service-types/{id}/status")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceDtos.TypeResponse typeStatus(@PathVariable Long id, @Valid @RequestBody ServiceDtos.ChangeStatus request) {
        return typeService.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá loại dịch vụ", description = "409 nếu loại đang có dịch vụ.")
    @DeleteMapping("/service-types/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_DELETE')")
    public void deleteType(@PathVariable Long id) {
        typeService.delete(id);
    }

    // ---------- Dịch vụ ----------

    @Operation(summary = "Danh sách dịch vụ",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập.")
    @GetMapping("/services")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public PageResponse<ServiceDtos.Response> services(@ParameterObject ServiceDtos.Filter filter,
                                                      @ParameterObject PageParams pageParams) {
        return serviceService.list(filter, pageParams);
    }

    @Operation(summary = "Dịch vụ đang hoạt động của một tòa (mặc định tòa đang chọn)")
    @GetMapping("/services/options")
    @PreAuthorize("hasAnyAuthority('SERVICE_READ', 'VOUCHER_WRITE')")
    public List<ServiceDtos.Option> serviceOptions(@RequestParam(required = false) Long buildingId) {
        return serviceService.options(buildingId);
    }

    @Operation(summary = "Chi tiết dịch vụ")
    @GetMapping("/services/{id}")
    @PreAuthorize("hasAuthority('SERVICE_READ')")
    public ServiceDtos.Response service(@PathVariable Long id) {
        return serviceService.get(id);
    }

    @Operation(summary = "Thêm dịch vụ vào tòa đang chọn", description = "Mã bỏ trống = tự sinh DV + 4 số.")
    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceDtos.Response createService(@Valid @RequestBody ServiceDtos.Request request,
                                             @AuthenticationPrincipal AuthUser actor) {
        return serviceService.create(request, actor);
    }

    @Operation(summary = "Cập nhật dịch vụ")
    @PutMapping("/services/{id}")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceDtos.Response updateService(@PathVariable Long id, @Valid @RequestBody ServiceDtos.Request request,
                                             @AuthenticationPrincipal AuthUser actor) {
        return serviceService.update(id, request, actor);
    }

    @Operation(summary = "Đổi trạng thái dịch vụ")
    @PatchMapping("/services/{id}/status")
    @PreAuthorize("hasAuthority('SERVICE_WRITE')")
    public ServiceDtos.Response serviceStatus(@PathVariable Long id, @Valid @RequestBody ServiceDtos.ChangeStatus request) {
        return serviceService.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá dịch vụ", description = "409 nếu voucher còn chỉ định dịch vụ.")
    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SERVICE_DELETE')")
    public void deleteService(@PathVariable Long id) {
        serviceService.delete(id);
    }
}
