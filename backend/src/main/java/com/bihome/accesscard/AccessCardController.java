package com.bihome.accesscard;

import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Thẻ từ")
@RestController
@RequestMapping("/api/v1/access-cards")
@RequiredArgsConstructor
public class AccessCardController {

    private final AccessCardService service;

    @Operation(summary = "Danh sách thẻ từ",
            description = "Lọc theo buildingId nếu truyền, nếu không theo X-Building-Id, nếu không là mọi tòa được truy cập.")
    @GetMapping
    @PreAuthorize("hasAuthority('ACCESS_CARD_READ')")
    public PageResponse<AccessCardDtos.Response> list(@ParameterObject AccessCardDtos.Filter filter,
                                                     @ParameterObject PageParams pageParams) {
        return service.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết thẻ từ")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCESS_CARD_READ')")
    public AccessCardDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Lịch sử trạng thái / gán thẻ", description = "Mới nhất trước.")
    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('ACCESS_CARD_READ')")
    public List<AccessCardDtos.HistoryEntry> history(@PathVariable Long id) {
        return service.history(id);
    }

    @Operation(summary = "Thêm thẻ", description = "Có apartmentId → cấp luôn (Đang dùng); không → nhập kho tòa đang chọn.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ACCESS_CARD_WRITE')")
    public AccessCardDtos.Response create(@Valid @RequestBody AccessCardDtos.Request request) {
        return service.create(request);
    }

    @Operation(summary = "Cập nhật thẻ", description = "Thẻ đang dùng đổi được căn hộ / cư dân / xe (ghi lịch sử).")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCESS_CARD_WRITE')")
    public AccessCardDtos.Response update(@PathVariable Long id, @Valid @RequestBody AccessCardDtos.Request request) {
        return service.update(id, request);
    }

    @Operation(summary = "Cấp thẻ trong kho", description = "Trong kho → Đang dùng, gắn căn hộ / cư dân / xe.")
    @PostMapping("/{id}/issue")
    @PreAuthorize("hasAuthority('ACCESS_CARD_WRITE')")
    public AccessCardDtos.Response issue(@PathVariable Long id, @Valid @RequestBody AccessCardDtos.IssueRequest request) {
        return service.issue(id, request);
    }

    @Operation(summary = "Đổi trạng thái thẻ", description = "Khoá, mở khoá, báo mất, thu hồi, nhập lại kho (theo allowedStatuses).")
    @PostMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ACCESS_CARD_WRITE')")
    public AccessCardDtos.Response changeStatus(@PathVariable Long id,
                                                @Valid @RequestBody AccessCardDtos.StatusRequest request) {
        return service.changeStatus(id, request);
    }

    @Operation(summary = "Xoá thẻ", description = "Chỉ thẻ trong kho chưa từng cấp.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ACCESS_CARD_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
