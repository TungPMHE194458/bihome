package com.bihome.dashboard;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.YearMonth;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Bảng điều khiển")
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(summary = "Số liệu bảng điều khiển",
            description = "Theo tòa đang chọn (X-Building-Id) hoặc mọi tòa được truy cập; month dạng yyyy-MM, mặc định tháng hiện tại.")
    @GetMapping
    @PreAuthorize("hasAuthority('DASHBOARD_READ')")
    public DashboardDtos.Summary summary(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return dashboardService.summary(month);
    }
}
