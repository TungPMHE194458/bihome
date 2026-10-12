package com.bihome.notification;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.notification.dto.AnnouncementDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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

@Tag(name = "Thông báo")
@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public record SendRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    @Operation(summary = "Danh sách thông báo của Ban quản lý", description = "Phạm vi theo tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('NOTIFICATION_READ')")
    public PageResponse<AnnouncementDtos.Response> list(@ParameterObject AnnouncementDtos.Filter filter,
                                                       @ParameterObject PageParams pageParams) {
        return announcementService.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết thông báo")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('NOTIFICATION_READ')")
    public AnnouncementDtos.Response get(@PathVariable Long id) {
        return announcementService.get(id);
    }

    @Operation(summary = "Tạo thông báo", description = "scheduledAt bỏ trống = lưu nháp; có giá trị = hẹn giờ gửi.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('NOTIFICATION_WRITE')")
    public AnnouncementDtos.Response create(@Valid @RequestBody AnnouncementDtos.Request request) {
        return announcementService.create(request);
    }

    @Operation(summary = "Sửa thông báo nháp / hẹn giờ")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('NOTIFICATION_WRITE')")
    public AnnouncementDtos.Response update(@PathVariable Long id, @Valid @RequestBody AnnouncementDtos.Request request) {
        return announcementService.update(id, request);
    }

    @Operation(summary = "Gửi ngay", description = "Tạo thông báo trong hệ thống cho nhân viên của tòa (nếu đối tượng có nhân viên).")
    @PostMapping("/{id}/send")
    @PreAuthorize("hasAuthority('NOTIFICATION_WRITE')")
    public AnnouncementDtos.Response send(@PathVariable Long id, @Valid @RequestBody SendRequest request) {
        return announcementService.send(id, request.version());
    }

    @Operation(summary = "Xoá thông báo nháp / hẹn giờ")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('NOTIFICATION_DELETE')")
    public void delete(@PathVariable Long id) {
        announcementService.delete(id);
    }
}
