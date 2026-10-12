package com.bihome.sos;

import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.sos.dto.SosDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Cảnh báo SOS")
@RestController
@RequestMapping("/api/v1/sos-alerts")
@RequiredArgsConstructor
public class SosAlertController {

    private final SosAlertService sosAlertService;

    @Operation(summary = "Danh sách cảnh báo", description = "open = true: chỉ cảnh báo chưa kết thúc.")
    @GetMapping
    @PreAuthorize("hasAuthority('SOS_READ')")
    public PageResponse<SosDtos.Response> list(@ParameterObject SosDtos.Filter filter, @ParameterObject PageParams pageParams) {
        return sosAlertService.list(filter, pageParams);
    }

    @Operation(summary = "Cảnh báo đang mở (nút SOS trên header)")
    @GetMapping("/active")
    @PreAuthorize("hasAuthority('SOS_READ')")
    public SosDtos.Active active() {
        return sosAlertService.active();
    }

    @Operation(summary = "Chi tiết cảnh báo")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SOS_READ')")
    public SosDtos.Response get(@PathVariable Long id) {
        return sosAlertService.get(id);
    }

    @Operation(summary = "Tạo cảnh báo (BQL nhận qua điện thoại / tại chỗ)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SOS_WRITE')")
    public SosDtos.Response create(@Valid @RequestBody SosDtos.CreateRequest request) {
        return sosAlertService.create(request);
    }

    @Operation(summary = "Tiếp nhận cảnh báo")
    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAuthority('SOS_WRITE')")
    public SosDtos.Response acknowledge(@PathVariable Long id, @Valid @RequestBody SosDtos.VersionRequest request,
                                       @AuthenticationPrincipal AuthUser actor) {
        return sosAlertService.acknowledge(id, request.version(), actor);
    }

    @Operation(summary = "Kết thúc cảnh báo (đã xử lý / báo nhầm)")
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('SOS_WRITE')")
    public SosDtos.Response resolve(@PathVariable Long id, @Valid @RequestBody SosDtos.ResolveRequest request,
                                   @AuthenticationPrincipal AuthUser actor) {
        return sosAlertService.resolve(id, request, actor);
    }
}
