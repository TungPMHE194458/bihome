package com.bihome.sos;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/** Cảnh báo khẩn cấp: Mới → Đã tiếp nhận → Đã xử lý / Báo nhầm (kết thúc cần ghi chú). */
@Getter
@Setter
@AuditTrail(module = "SOS", type = "SOS_ALERT", label = "code")
@Entity
@Table(name = "SOS_ALERT")
public class SosAlert extends BuildingScopedEntity {

    public enum AlertType { FIRE, MEDICAL, SECURITY, ELEVATOR, OTHER }

    /** MANUAL: BQL tạo (nhận qua điện thoại / tại chỗ); APP: cư dân bấm SOS trên app (sau này). */
    public enum Source { MANUAL, APP }

    public enum Status { NEW, ACKNOWLEDGED, RESOLVED, FALSE_ALARM }

    public static final Set<Status> OPEN = EnumSet.of(Status.NEW, Status.ACKNOWLEDGED);

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20, updatable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "ALERT_TYPE", nullable = false, length = 20)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(name = "SOURCE", nullable = false, length = 10, updatable = false)
    private Source source;

    @Column(name = "APARTMENT_ID")
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "REPORTER_NAME", length = 150)
    private String reporterName;

    @Column(name = "REPORTER_PHONE", length = 20)
    private String reporterPhone;

    @Column(name = "LOCATION", length = 200)
    private String location;

    @Column(name = "DESCRIPTION", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "ACKNOWLEDGED_AT")
    private OffsetDateTime acknowledgedAt;

    @Column(name = "ACKNOWLEDGED_BY", length = 100)
    private String acknowledgedBy;

    @Column(name = "RESOLVED_AT")
    private OffsetDateTime resolvedAt;

    @Column(name = "RESOLVED_BY", length = 100)
    private String resolvedBy;

    @Column(name = "RESOLUTION_NOTE", length = 1000)
    private String resolutionNote;
}
