package com.bihome.ticket;

import com.bihome.common.security.AuthUser;
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

@Tag(name = "Yêu cầu và hỗ trợ")
@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService service;

    @Operation(summary = "Danh sách yêu cầu",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập. "
                    + "overdue=true: chỉ yêu cầu quá hạn SLA.")
    @GetMapping
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public PageResponse<TicketDtos.Summary> list(@ParameterObject TicketDtos.Filter filter,
                                                 @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Kanban theo trạng thái", description = "Mỗi cột: tổng số + tối đa 50 yêu cầu mới nhất.")
    @GetMapping("/board")
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public List<TicketDtos.BoardColumn> board(@ParameterObject TicketDtos.Filter filter) {
        return service.board(filter);
    }

    @Operation(summary = "Người có thể nhận xử lý ở một tòa", description = "Mặc định tòa đang chọn.")
    @GetMapping("/assignees")
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public List<TicketDtos.Assignee> assignees(@RequestParam(required = false) Long buildingId) {
        return service.assignees(buildingId);
    }

    @Operation(summary = "Chi tiết yêu cầu")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public TicketDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Dòng thời gian", description = "Tạo, đổi trạng thái, phân công, bình luận — từ cũ đến mới.")
    @GetMapping("/{id}/timeline")
    @PreAuthorize("hasAuthority('TICKET_READ')")
    public List<TicketDtos.TimelineEntry> timeline(@PathVariable Long id) {
        return service.timeline(id);
    }

    @Operation(summary = "Thêm yêu cầu",
            description = "Vào tòa đang chọn (hoặc tòa của căn hộ). Tệp tải trước qua POST /files purpose=TICKET_ATTACHMENT.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.Response create(@Valid @RequestBody TicketDtos.Request request,
                                      @AuthenticationPrincipal AuthUser actor) {
        return service.create(request, actor);
    }

    @Operation(summary = "Cập nhật yêu cầu", description = "assigneeId bị bỏ qua — dùng PUT /{id}/assignee.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.Response update(@PathVariable Long id, @Valid @RequestBody TicketDtos.Request request,
                                      @AuthenticationPrincipal AuthUser actor) {
        return service.update(id, request, actor);
    }

    @Operation(summary = "Chuyển trạng thái", description = "Theo luồng hợp lệ (allowedStatuses ở chi tiết); Huỷ cần lý do.")
    @PostMapping("/{id}/status")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.Response changeStatus(@PathVariable Long id, @Valid @RequestBody TicketDtos.StatusRequest request,
                                            @AuthenticationPrincipal AuthUser actor) {
        return service.changeStatus(id, request, actor);
    }

    @Operation(summary = "Phân công người xử lý", description = "assigneeId null = bỏ phân công.")
    @PutMapping("/{id}/assignee")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.Response assign(@PathVariable Long id, @Valid @RequestBody TicketDtos.AssignRequest request) {
        return service.assign(id, request);
    }

    @Operation(summary = "Bình luận", description = "INTERNAL: chỉ ban quản lý; PUBLIC: cư dân xem được.")
    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.TimelineEntry comment(@PathVariable Long id, @Valid @RequestBody TicketDtos.CommentRequest request,
                                            @AuthenticationPrincipal AuthUser actor) {
        return service.comment(id, request, actor);
    }

    @Operation(summary = "Ghi nhận đánh giá 1–5 sao", description = "Chỉ khi đã Hoàn thành / Đóng.")
    @PutMapping("/{id}/rating")
    @PreAuthorize("hasAuthority('TICKET_WRITE')")
    public TicketDtos.Response rate(@PathVariable Long id, @Valid @RequestBody TicketDtos.RatingRequest request) {
        return service.rate(id, request);
    }

    @Operation(summary = "Xoá yêu cầu", description = "Chỉ yêu cầu Mới hoặc đã Huỷ.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('TICKET_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
