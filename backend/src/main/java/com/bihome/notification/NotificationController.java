package com.bihome.notification;

import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.notification.dto.NotificationDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Thông báo của chính người đang đăng nhập — chỉ cần đăng nhập. */
@Tag(name = "Thông báo")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Thông báo của tôi (mới nhất trước)")
    @GetMapping
    public PageResponse<NotificationDtos.Response> mine(@RequestParam(defaultValue = "false") boolean unreadOnly,
                                                       @ParameterObject PageParams pageParams) {
        return notificationService.mine(unreadOnly, pageParams);
    }

    @Operation(summary = "Số thông báo chưa đọc", description = "FE gọi định kỳ 30 giây để cập nhật badge.")
    @GetMapping("/unread-count")
    public NotificationDtos.UnreadCount unreadCount() {
        return notificationService.unreadCount();
    }

    @Operation(summary = "Đánh dấu đã đọc")
    @PostMapping("/{id}/read")
    public NotificationDtos.Response markRead(@PathVariable Long id) {
        return notificationService.markRead(id);
    }

    @Operation(summary = "Đánh dấu tất cả đã đọc")
    @PostMapping("/read-all")
    public NotificationDtos.UnreadCount markAllRead() {
        return notificationService.markAllRead();
    }

    @Operation(summary = "Đăng ký push token (Expo) của thiết bị cài app nhân viên")
    @PostMapping("/push-tokens")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registerPushToken(@Valid @RequestBody NotificationDtos.PushTokenRequest request) {
        notificationService.registerPushToken(request);
    }

    @Operation(summary = "Huỷ push token của thiết bị (khi đăng xuất)")
    @DeleteMapping("/push-tokens/{token}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregisterPushToken(@PathVariable String token) {
        notificationService.unregisterPushToken(token);
    }
}
