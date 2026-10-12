package com.bihome.reminder;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.reminder.dto.ReminderDtos;
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

@Tag(name = "Nhắc nhở")
@RestController
@RequestMapping("/api/v1/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @Operation(summary = "Danh sách nhắc nhở", description = "Phạm vi theo tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('REMINDER_READ')")
    public PageResponse<ReminderDtos.Response> list(@ParameterObject ReminderDtos.Filter filter,
                                                   @ParameterObject PageParams pageParams) {
        return reminderService.list(filter, pageParams);
    }

    @Operation(summary = "Các tầng của tòa đang chọn (chọn đối tượng theo tầng)")
    @GetMapping("/floors")
    @PreAuthorize("hasAnyAuthority('REMINDER_WRITE', 'SURVEY_WRITE')")
    public List<String> floors() {
        return reminderService.floors();
    }

    @Operation(summary = "Xem trước người nhận", description = "Cư dân đang ở thuộc đối tượng trong tòa đang chọn.")
    @PostMapping("/preview-recipients")
    @PreAuthorize("hasAnyAuthority('REMINDER_WRITE', 'SURVEY_WRITE')")
    public ReminderDtos.RecipientPreview preview(@Valid @RequestBody ReminderDtos.AudienceRequest request) {
        return reminderService.preview(request);
    }

    @Operation(summary = "Chi tiết nhắc nhở")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('REMINDER_READ')")
    public ReminderDtos.Response get(@PathVariable Long id) {
        return reminderService.get(id);
    }

    @Operation(summary = "Lịch sử gửi (từng cư dân × kênh)")
    @GetMapping("/{id}/deliveries")
    @PreAuthorize("hasAuthority('REMINDER_READ')")
    public PageResponse<ReminderDtos.DeliveryResponse> deliveries(@PathVariable Long id, @ParameterObject PageParams pageParams) {
        return reminderService.deliveries(id, pageParams);
    }

    @Operation(summary = "Tạo nhắc nhở", description = "draft = lưu nháp; NOW gửi ngay; ONCE / MONTHLY lên lịch.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('REMINDER_WRITE')")
    public ReminderDtos.Response create(@Valid @RequestBody ReminderDtos.Request request) {
        return reminderService.create(request);
    }

    @Operation(summary = "Sửa nhắc nhở nháp / đã lên lịch")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('REMINDER_WRITE')")
    public ReminderDtos.Response update(@PathVariable Long id, @Valid @RequestBody ReminderDtos.Request request) {
        return reminderService.update(id, request);
    }

    @Operation(summary = "Gửi ngay")
    @PostMapping("/{id}/send")
    @PreAuthorize("hasAuthority('REMINDER_WRITE')")
    public ReminderDtos.Response send(@PathVariable Long id, @Valid @RequestBody ReminderDtos.VersionRequest request) {
        return reminderService.sendNow(id, request.version());
    }

    @Operation(summary = "Huỷ lịch gửi")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('REMINDER_WRITE')")
    public ReminderDtos.Response cancel(@PathVariable Long id, @Valid @RequestBody ReminderDtos.VersionRequest request) {
        return reminderService.cancel(id, request.version());
    }

    @Operation(summary = "Xoá nhắc nhở nháp / đã huỷ")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('REMINDER_DELETE')")
    public void delete(@PathVariable Long id) {
        reminderService.delete(id);
    }
}
