package com.bihome.meter;

import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.excel.ImportResult;
import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.meter.MeterReading.MeterType;
import com.bihome.meter.dto.MeterReadingDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Số liệu điện nước")
@RestController
@RequestMapping("/api/v1/meter-readings")
@RequiredArgsConstructor
public class MeterReadingController {

    private final MeterReadingService meterReadingService;

    @Operation(summary = "Danh sách số liệu", description = "spike = true: chỉ số liệu tăng > 200% so với trung bình 3 kỳ.")
    @GetMapping
    @PreAuthorize("hasAuthority('METER_READING_READ')")
    public PageResponse<MeterReadingDtos.Response> list(@ParameterObject MeterReadingDtos.Filter filter,
                                                       @ParameterObject PageParams pageParams) {
        return meterReadingService.list(filter, pageParams);
    }

    @Operation(summary = "Chỉ số kỳ trước của căn (gợi ý cho form thêm)")
    @GetMapping("/previous")
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public MeterReadingDtos.PreviousInfo previous(@RequestParam Long apartmentId, @RequestParam MeterType meterType,
                                                 @RequestParam String period) {
        return meterReadingService.previous(apartmentId, meterType, period);
    }

    @Operation(summary = "Lưới nhập nhanh theo tầng", description = "Mọi căn đang hoạt động của tòa đang chọn (lọc theo tầng).")
    @GetMapping("/sheet")
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public MeterReadingDtos.Sheet sheet(@RequestParam String period, @RequestParam MeterType meterType,
                                       @RequestParam(required = false) String floor) {
        return meterReadingService.sheet(period, meterType, floor);
    }

    @Operation(summary = "Lưu lưới nhập nhanh", description = "Dòng trống bỏ qua; lỗi ở một dòng thì không lưu dòng nào.")
    @PutMapping("/sheet")
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public MeterReadingDtos.SheetResult saveSheet(@Valid @RequestBody MeterReadingDtos.SheetRequest request) {
        return meterReadingService.saveSheet(request);
    }

    @Operation(summary = "File mẫu nhập số liệu")
    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public ResponseEntity<byte[]> importTemplate() {
        return ExcelResponses.attachment(meterReadingService.importTemplate(), "mau-nhap-so-lieu.xlsx");
    }

    @Operation(summary = "Nhập số liệu từ Excel cho một kỳ")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public ImportResult importExcel(@RequestParam("file") MultipartFile file, @RequestParam String period,
                                    @RequestParam(defaultValue = "true") boolean stopOnError) {
        return meterReadingService.importExcel(file, period, stopOnError);
    }

    @Operation(summary = "Chi tiết số liệu")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('METER_READING_READ')")
    public MeterReadingDtos.Response get(@PathVariable Long id) {
        return meterReadingService.get(id);
    }

    @Operation(summary = "Thêm số liệu")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public MeterReadingDtos.Response create(@Valid @RequestBody MeterReadingDtos.CreateRequest request,
                                           @AuthenticationPrincipal AuthUser actor) {
        return meterReadingService.create(request, actor);
    }

    @Operation(summary = "Sửa số liệu", description = "Kỳ đã phát hành thông báo phí thì không sửa được.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('METER_READING_WRITE')")
    public MeterReadingDtos.Response update(@PathVariable Long id, @Valid @RequestBody MeterReadingDtos.UpdateRequest request,
                                           @AuthenticationPrincipal AuthUser actor) {
        return meterReadingService.update(id, request, actor);
    }

    @Operation(summary = "Xoá số liệu")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('METER_READING_DELETE')")
    public void delete(@PathVariable Long id) {
        meterReadingService.delete(id);
    }
}
