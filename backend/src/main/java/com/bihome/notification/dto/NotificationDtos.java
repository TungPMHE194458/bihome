package com.bihome.notification.dto;

import com.bihome.notification.NotificationType;
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
}
