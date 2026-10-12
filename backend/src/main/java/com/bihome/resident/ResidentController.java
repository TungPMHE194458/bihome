package com.bihome.resident;

import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.excel.ImportResult;
import com.bihome.common.security.AuthUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.resident.dto.ResidentDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

@Tag(name = "Cư dân")
@RestController
@RequestMapping("/api/v1/residents")
@RequiredArgsConstructor
public class ResidentController {

    private final ResidentService residentService;

    @Operation(summary = "Danh sách cư dân",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập. "
                    + "Số giấy tờ đã được che bớt.")
    @GetMapping
    @PreAuthorize("hasAuthority('RESIDENT_READ')")
    public PageResponse<ResidentDtos.Summary> list(@ParameterObject ResidentDtos.Filter filter,
                                                  @ParameterObject PageParams pageParams) {
        return residentService.list(filter, pageParams);
    }

    @Operation(summary = "Cư dân của một căn hộ", description = "Người đang ở trước, sau đó là lịch sử đã chuyển đi.")
    @GetMapping("/apartment/{apartmentId}")
    @PreAuthorize("hasAuthority('RESIDENT_READ')")
    public List<ResidentDtos.ApartmentMember> byApartment(@PathVariable Long apartmentId) {
        return residentService.byApartment(apartmentId);
    }

    @Operation(summary = "Xuất Excel theo bộ lọc hiện tại", description = "Số giấy tờ được che bớt.")
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('RESIDENT_EXPORT')")
    public ResponseEntity<byte[]> export(@ParameterObject ResidentDtos.Filter filter) {
        return ExcelResponses.attachment(residentService.export(filter), residentService.exportFileName(filter));
    }

    @Operation(summary = "Tải file Excel mẫu để nhập cư dân")
    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResponseEntity<byte[]> importTemplate() {
        return ExcelResponses.attachment(residentService.importTemplate(), "mau-nhap-cu-dan.xlsx");
    }

    @Operation(summary = "Nhập cư dân từ Excel vào tòa đang chọn",
            description = "Mỗi dòng một cư dân mới gắn với một căn hộ. stopOnError=true: có dòng lỗi thì không nhập dòng nào.")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ImportResult importExcel(@RequestParam("file") MultipartFile file,
                                    @RequestParam(defaultValue = "true") boolean stopOnError,
                                    @AuthenticationPrincipal AuthUser actor) {
        return residentService.importExcel(file, stopOnError, actor);
    }

    @Operation(summary = "Chi tiết cư dân", description = "Số giấy tờ đầy đủ và toàn bộ lịch sử cư trú.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('RESIDENT_READ')")
    public ResidentDtos.Response get(@PathVariable Long id) {
        return residentService.get(id);
    }

    @Operation(summary = "Thêm cư dân", description = "Bắt buộc gán căn hộ đầu tiên; cư dân thuộc tòa của căn hộ đó.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentDtos.Response create(@Valid @RequestBody ResidentDtos.Request request,
                                        @AuthenticationPrincipal AuthUser actor) {
        return residentService.create(request, actor);
    }

    @Operation(summary = "Cập nhật thông tin cá nhân của cư dân", description = "Trường apartment bị bỏ qua.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentDtos.Response update(@PathVariable Long id, @Valid @RequestBody ResidentDtos.Request request,
                                        @AuthenticationPrincipal AuthUser actor) {
        return residentService.update(id, request, actor);
    }

    @Operation(summary = "Gán cư dân vào thêm một căn hộ cùng tòa")
    @PostMapping("/{id}/apartments")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentDtos.Response assignApartment(@PathVariable Long id,
                                                 @Valid @RequestBody ResidentDtos.LinkRequest request) {
        return residentService.assignApartment(id, request);
    }

    @Operation(summary = "Sửa thông tin cư trú tại một căn hộ", description = "Không đổi được căn hộ.")
    @PutMapping("/{id}/apartments/{linkId}")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentDtos.Response updateApartment(@PathVariable Long id, @PathVariable Long linkId,
                                                 @Valid @RequestBody ResidentDtos.LinkRequest request) {
        return residentService.updateApartment(id, linkId, request);
    }

    @Operation(summary = "Chuyển đi", description = "linkIds bỏ trống = chuyển đi khỏi mọi căn đang ở.")
    @PostMapping("/{id}/move-out")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentDtos.Response moveOut(@PathVariable Long id, @Valid @RequestBody ResidentDtos.MoveOutRequest request) {
        return residentService.moveOut(id, request);
    }

    @Operation(summary = "Xoá cư dân", description = "Chỉ khi cư dân không còn ở căn hộ nào.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('RESIDENT_DELETE')")
    public void delete(@PathVariable Long id) {
        residentService.delete(id);
    }
}
