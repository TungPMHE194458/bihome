package com.bihome.audit;

import com.bihome.audit.dto.AuditDtos;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Lịch sử hoạt động")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @Operation(summary = "Lịch sử hoạt động",
            description = "Ai, làm gì, với đối tượng nào, lúc nào. Lọc theo module, loại / id đối tượng, thao tác, người "
                    + "thao tác, khoảng ngày; phạm vi theo tòa đang chọn.")
    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('AUDIT_LOG_READ')")
    public PageResponse<AuditDtos.Response> list(@ParameterObject AuditDtos.Filter filter,
                                                 @ParameterObject PageParams pageParams) {
        return auditLogService.list(filter, pageParams);
    }

    @Operation(summary = "Lịch sử đăng nhập")
    @GetMapping("/login-history")
    @PreAuthorize("hasAuthority('USER_READ')")
    public PageResponse<AuditDtos.LoginResponse> logins(@ParameterObject AuditDtos.LoginFilter filter,
                                                        @ParameterObject PageParams pageParams) {
        return auditLogService.logins(filter, pageParams);
    }
}
