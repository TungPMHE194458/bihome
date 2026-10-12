package com.bihome.document;

import com.bihome.common.security.AuthUser;
import com.bihome.common.storage.FileContentResponses;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.document.dto.DocumentDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
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

@Tag(name = "Tài liệu")
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;

    @Operation(summary = "Danh sách tài liệu",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập.")
    @GetMapping
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public PageResponse<DocumentDtos.Response> list(@ParameterObject DocumentDtos.Filter filter,
                                                    @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Gợi ý thẻ đã dùng", description = "Tối đa 20 thẻ khớp từ khoá, trong phạm vi tòa như danh sách.")
    @GetMapping("/tags")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public List<String> tags(@RequestParam(required = false) String keyword) {
        return service.tags(keyword);
    }

    @Operation(summary = "Chi tiết tài liệu")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public DocumentDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Xem trước / tải tệp hiện tại", description = "Ảnh/PDF hiển thị trực tiếp; download=true để tải về.")
    @GetMapping("/{id}/content")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public ResponseEntity<Resource> content(@PathVariable Long id,
                                            @RequestParam(defaultValue = "false") boolean download) {
        return FileContentResponses.of(service.content(id), download);
    }

    @Operation(summary = "Các phiên bản tệp", description = "Phiên bản hiện tại trước, sau đó các bản cũ mới nhất trước.")
    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public List<DocumentDtos.FileVersion> versions(@PathVariable Long id) {
        return service.fileVersions(id);
    }

    @Operation(summary = "Xem / tải một phiên bản tệp cũ")
    @GetMapping("/{id}/versions/{versionId}/content")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public ResponseEntity<Resource> versionContent(@PathVariable Long id, @PathVariable Long versionId,
                                                   @RequestParam(defaultValue = "false") boolean download) {
        return FileContentResponses.of(service.versionContent(id, versionId), download);
    }

    @Operation(summary = "Thêm tài liệu vào tòa đang chọn",
            description = "Tải tệp lên trước qua POST /files (purpose=DOCUMENT) rồi gửi fileId. Mã bỏ trống = tự sinh số.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('DOCUMENT_WRITE')")
    public DocumentDtos.Response create(@Valid @RequestBody DocumentDtos.Request request,
                                        @AuthenticationPrincipal AuthUser actor) {
        return service.create(request, actor);
    }

    @Operation(summary = "Cập nhật thông tin tài liệu", description = "fileId bị bỏ qua; dùng POST /{id}/file để thay tệp.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DOCUMENT_WRITE')")
    public DocumentDtos.Response update(@PathVariable Long id, @Valid @RequestBody DocumentDtos.Request request) {
        return service.update(id, request);
    }

    @Operation(summary = "Thay tệp", description = "Tệp hiện tại được lưu thành phiên bản cũ.")
    @PostMapping("/{id}/file")
    @PreAuthorize("hasAuthority('DOCUMENT_WRITE')")
    public DocumentDtos.Response replaceFile(@PathVariable Long id,
                                             @Valid @RequestBody DocumentDtos.ReplaceFileRequest request,
                                             @AuthenticationPrincipal AuthUser actor) {
        return service.replaceFile(id, request, actor);
    }

    @Operation(summary = "Xoá tài liệu", description = "Xoá cả các phiên bản và tệp đã lưu.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('DOCUMENT_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
