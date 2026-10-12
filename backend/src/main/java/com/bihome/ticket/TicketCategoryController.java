package com.bihome.ticket;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.ticket.dto.TicketDtos;
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

@Tag(name = "Danh mục yêu cầu & hỗ trợ")
@RestController
@RequestMapping("/api/v1/ticket-categories")
@RequiredArgsConstructor
public class TicketCategoryController {

    private final TicketCategoryService service;

    @Operation(summary = "Danh sách danh mục yêu cầu", description = "Dùng chung cho mọi tòa.")
    @GetMapping
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public PageResponse<TicketDtos.CategoryResponse> list(@ParameterObject TicketDtos.CategoryFilter filter,
                                                         @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Danh mục đang hoạt động cho ô chọn")
    @GetMapping("/options")
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public List<TicketDtos.CategoryOption> options() {
        return service.options();
    }

    @Operation(summary = "Người có thể làm người phụ trách mặc định", description = "User đang hoạt động có quyền TICKET_WRITE.")
    @GetMapping("/assignees")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public List<TicketDtos.Assignee> assignees() {
        return service.handlers(null);
    }

    @Operation(summary = "Chi tiết danh mục yêu cầu")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public TicketDtos.CategoryResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Thêm danh mục yêu cầu")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.CategoryResponse create(@Valid @RequestBody TicketDtos.CategoryRequest request) {
        return service.create(request);
    }

    @Operation(summary = "Cập nhật danh mục yêu cầu", description = "SLA mới chỉ áp dụng cho yêu cầu tạo sau đó.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.CategoryResponse update(@PathVariable Long id, @Valid @RequestBody TicketDtos.CategoryRequest request) {
        return service.update(id, request);
    }

    @Operation(summary = "Đổi trạng thái danh mục yêu cầu")
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.CategoryResponse changeStatus(@PathVariable Long id,
                                                    @Valid @RequestBody TicketDtos.ChangeCategoryStatus request) {
        return service.changeStatus(id, request.status());
    }

    @Operation(summary = "Xoá danh mục yêu cầu", description = "409 nếu danh mục đang có yêu cầu.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('TICKET_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
