package com.bihome.apartment;

import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.excel.ImportResult;
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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Căn hộ")
@RestController
@RequestMapping("/api/v1/apartments")
@RequiredArgsConstructor
public class ApartmentController {

    private final ApartmentService apartmentService;

    @Operation(summary = "Danh sách căn hộ",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập.")
    @GetMapping
    @PreAuthorize("hasAuthority('APARTMENT_READ')")
    public PageResponse<ApartmentDtos.Summary> list(@ParameterObject ApartmentDtos.Filter filter,
                                                   @ParameterObject PageParams pageParams) {
        return apartmentService.list(filter, pageParams);
    }

    @Operation(summary = "Gợi ý căn hộ cho ô chọn",
            description = "Tối đa 20 căn đang hoạt động khớp mã/tên; phạm vi tòa như danh sách.")
    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('APARTMENT_READ', 'ASSET_WRITE', 'RESIDENT_WRITE')")
    public List<ApartmentDtos.Option> options(@RequestParam(required = false) String keyword,
                                              @RequestParam(required = false) Long buildingId) {
        return apartmentService.options(keyword, buildingId);
    }

    @Operation(summary = "Xuất Excel theo bộ lọc hiện tại")
    @GetMapping("/export")
    @PreAuthorize("hasAuthority('APARTMENT_EXPORT')")
    public ResponseEntity<byte[]> export(@ParameterObject ApartmentDtos.Filter filter) {
        return ExcelResponses.attachment(apartmentService.export(filter), apartmentService.exportFileName(filter));
    }

    @Operation(summary = "Tải file Excel mẫu để nhập căn hộ")
    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('APARTMENT_WRITE')")
    public ResponseEntity<byte[]> importTemplate() {
        return ExcelResponses.attachment(apartmentService.importTemplate(), "mau-nhap-can-ho.xlsx");
    }

    @Operation(summary = "Nhập căn hộ từ Excel vào tòa đang chọn",
            description = "stopOnError=true: nếu có dòng lỗi thì không nhập dòng nào. Trả kết quả từng dòng.")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('APARTMENT_WRITE')")
    public ImportResult importExcel(@RequestParam("file") MultipartFile file,
                                    @RequestParam(defaultValue = "true") boolean stopOnError,
                                    @AuthenticationPrincipal AuthUser actor) {
        return apartmentService.importExcel(file, stopOnError, actor);
    }

    @Operation(summary = "Chi tiết căn hộ")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('APARTMENT_READ')")
    public ApartmentDtos.Response get(@PathVariable Long id) {
        return apartmentService.get(id);
    }

    @Operation(summary = "Thêm căn hộ", description = "buildingId bỏ trống = tòa đang chọn ở header.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('APARTMENT_WRITE')")
    public ApartmentDtos.Response create(@Valid @RequestBody ApartmentDtos.Request request,
                                         @AuthenticationPrincipal AuthUser actor) {
        return apartmentService.create(request, actor);
    }

    @Operation(summary = "Cập nhật căn hộ", description = "Không đổi được tòa nhà của căn hộ.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('APARTMENT_WRITE')")
    public ApartmentDtos.Response update(@PathVariable Long id, @Valid @RequestBody ApartmentDtos.Request request,
                                         @AuthenticationPrincipal AuthUser actor) {
        return apartmentService.update(id, request, actor);
    }

    @Operation(summary = "Đổi trạng thái căn hộ")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('APARTMENT_WRITE')")
    public ApartmentDtos.Response changeStatus(@PathVariable Long id,
                                               @Valid @RequestBody ApartmentDtos.ChangeStatus request) {
        return apartmentService.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá căn hộ")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('APARTMENT_DELETE')")
    public void delete(@PathVariable Long id) {
        apartmentService.delete(id);
    }
}
