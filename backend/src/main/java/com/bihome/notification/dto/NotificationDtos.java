package com.bihome.notification.dto;

import com.bihome.notification.NotificationType;
import com.bihome.notification.UserPushToken;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record Response(
            Long id,
            NotificationType type,
            String title,
            String body,
            String link,
            Long buildingId,
            boolean read,
            OffsetDateTime createdAt) {
    }

    public record UnreadCount(long count) {
    }

    public record PushTokenRequest(
            @NotBlank @Size(max = 255) String token,
            @NotNull UserPushToken.Platform platform) {
    }
}
