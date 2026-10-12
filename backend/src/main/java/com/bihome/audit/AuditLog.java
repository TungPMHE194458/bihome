package com.bihome.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

/** Bản ghi lịch sử hoạt động — chỉ đọc qua JPA, ghi bằng {@link AuditEventListener}. */
@Getter
@Entity
@Immutable
@Table(name = "AUDIT_LOG")
public class AuditLog {

    @Id
    @Column(name = "ID")
    private Long id;

    @Column(name = "OCCURRED_AT")
    private OffsetDateTime occurredAt;

    @Column(name = "ACTOR_ID")
    private Long actorId;

    @Column(name = "ACTOR_USERNAME")
    private String actorUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "ACTION")
    private AuditAction action;

    @Column(name = "MODULE_CODE")
    private String moduleCode;

    @Column(name = "ENTITY_TYPE")
    private String entityType;

    @Column(name = "ENTITY_ID")
    private String entityId;

    @Column(name = "ENTITY_LABEL")
    private String entityLabel;

    @Column(name = "BUILDING_ID")
    private Long buildingId;

    @Lob
    @Column(name = "CHANGES")
    private String changes;

    @Column(name = "IP_ADDRESS")
    private String ipAddress;
}
