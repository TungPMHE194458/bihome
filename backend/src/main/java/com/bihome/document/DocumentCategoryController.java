package com.bihome.document;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.document.dto.DocumentDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

@Tag(name = "Danh mục tài liệu")
@RestController
@RequestMapping("/api/v1/document-categories")
@RequiredArgsConstructor
public class DocumentCategoryController {

    private final DocumentCategoryService service;

    @Operation(summary = "Danh sách danh mục tài liệu", description = "Dùng chung cho mọi tòa, không lọc theo X-Building-Id.")
    @GetMapping
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public PageResponse<DocumentDtos.CategoryResponse> list(@ParameterObject DocumentDtos.CategoryFilter filter,
                                                           @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Danh mục đang hoạt động cho ô chọn")
    @GetMapping("/options")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public List<DocumentDtos.CategoryOption> options() {
        return service.options();
    }

    @Operation(summary = "Chi tiết danh mục tài liệu")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DOCUMENT_READ')")
    public DocumentDtos.CategoryResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Thêm danh mục tài liệu")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('DOCUMENT_WRITE')")
    public DocumentDtos.CategoryResponse create(@Valid @RequestBody DocumentDtos.CategoryRequest request) {
        return service.create(request);
    }

    @Operation(summary = "Cập nhật danh mục tài liệu")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DOCUMENT_WRITE')")
    public DocumentDtos.CategoryResponse update(@PathVariable Long id,
                                                @Valid @RequestBody DocumentDtos.CategoryRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Đổi trạng thái danh mục tài liệu")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('DOCUMENT_WRITE')")
    public DocumentDtos.CategoryResponse changeStatus(@PathVariable Long id,
                                                      @Valid @RequestBody DocumentDtos.ChangeStatus request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá danh mục tài liệu", description = "409 nếu danh mục đang có tài liệu.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('DOCUMENT_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
