package com.bihome.audit.dto;

import com.bihome.audit.AuditAction;
import com.bihome.audit.AuditChange;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class AuditDtos {

    private AuditDtos() {
    }

    /**
     * @param actor      tên đăng nhập người thao tác (chứa)
     * @param keyword    tìm theo nhãn đối tượng / người thao tác
     */
    public record Filter(
            String keyword,
            Long buildingId,
            String module,
            String entityType,
            String entityId,
            AuditAction action,
            String actor,
            LocalDate from,
            LocalDate to) {
    }

    public record Response(
            Long id,
            OffsetDateTime occurredAt,
            Long actorId,
            String actorUsername,
            String actorName,
            AuditAction action,
            String module,
            String entityType,
            String entityId,
            String entityLabel,
            Long buildingId,
            String buildingName,
            List<AuditChange> changes,
            String ipAddress) {
    }

    public record LoginFilter(String keyword, Boolean success, LocalDate from, LocalDate to) {
    }

    public record LoginResponse(
            Long id,
            OffsetDateTime createdAt,
            Long userId,
            String loginName,
            String fullName,
            boolean success,
            String failureReason,
            String ipAddress,
            String userAgent) {
    }
}
