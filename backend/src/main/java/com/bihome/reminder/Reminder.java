package com.bihome.reminder;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.common.entity.HhmmTimeConverter;
import com.bihome.resident.ResidentAudienceService.Audience;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/** Nhắc nhở gửi cư dân: gửi ngay, hẹn giờ một lần hoặc lặp hằng tháng vào ngày X. */
@Getter
@Setter
@AuditTrail(module = "REMINDER", type = "REMINDER", label = "title", ignore = {"nextRunAt", "lastSentAt", "runCount", "recipientCount"})
@Entity
@Table(name = "REMINDER")
public class Reminder extends BuildingScopedEntity {

    public enum ScheduleType { NOW, ONCE, MONTHLY }

    public enum Channel { IN_APP, EMAIL, SMS }

    /** Nháp → Đã lên lịch → Đã gửi; nháp / đã lên lịch thì huỷ được. Lặp hằng tháng giữ Đã lên lịch tới ngày kết thúc. */
    public enum Status { DRAFT, SCHEDULED, SENT, CANCELLED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Lob
    @Column(name = "CONTENT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "AUDIENCE", nullable = false, length = 20)
    private Audience audience;

    /** Tầng / id căn hộ / id cư dân theo {@link #audience}; luôn gán tập mới. */
    @ElementCollection
    @CollectionTable(name = "REMINDER_TARGET", joinColumns = @JoinColumn(name = "REMINDER_ID"))
    @Column(name = "TARGET_VALUE", nullable = false, length = 40)
    @BatchSize(size = 50)
    private Set<String> targets = new LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "REMINDER_CHANNEL", joinColumns = @JoinColumn(name = "REMINDER_ID"))
    @Enumerated(EnumType.STRING)
    @Column(name = "CHANNEL", nullable = false, length = 10)
    @BatchSize(size = 50)
    private Set<Channel> channels = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "SCHEDULE_TYPE", nullable = false, length = 20)
    private ScheduleType scheduleType;

    @Column(name = "SCHEDULED_AT")
    private OffsetDateTime scheduledAt;

    @Column(name = "MONTHLY_DAY")
    private Integer monthlyDay;

    @Convert(converter = HhmmTimeConverter.class)
    @Column(name = "MONTHLY_TIME", length = 5)
    private LocalTime monthlyTime;

    @Column(name = "END_DATE")
    private LocalDate endDate;

    @Column(name = "NEXT_RUN_AT")
    private OffsetDateTime nextRunAt;

    @Column(name = "LAST_SENT_AT")
    private OffsetDateTime lastSentAt;

    @Column(name = "RUN_COUNT", nullable = false)
    private int runCount;

    @Column(name = "RECIPIENT_COUNT", nullable = false)
    private int recipientCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;
}
