package com.bihome.amenityreport;

import com.bihome.common.excel.ExcelResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Báo cáo tiện ích")
@RestController
@RequestMapping("/api/v1/amenity-reports")
@RequiredArgsConstructor
public class AmenityReportController {

    private final AmenityReportService reportService;

    @Operation(summary = "Báo cáo tiện ích",
            description = "Theo ngày sử dụng trong [from, to] (mặc định tháng hiện tại, tối đa 366 ngày), lọc 1 tiện ích hoặc mọi tiện ích của tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('AMENITY_REPORT_READ')")
    public AmenityReportDtos.Report report(@RequestParam(required = false) LocalDate from,
                                           @RequestParam(required = false) LocalDate to,
                                           @RequestParam(required = false) Long amenityId) {
        return reportService.report(from, to, amenityId);
    }

    @Operation(summary = "Xuất Excel báo cáo tiện ích")
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('AMENITY_REPORT_EXPORT')")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) LocalDate from,
                                         @RequestParam(required = false) LocalDate to,
                                         @RequestParam(required = false) Long amenityId) {
        AmenityReportDtos.Report r = reportService.report(from, to, amenityId);
        return ExcelResponses.attachment(reportService.export(from, to, amenityId), reportService.exportFileName(r.from(), r.to()));
    }
}
