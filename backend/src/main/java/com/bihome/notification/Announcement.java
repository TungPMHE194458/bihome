package com.bihome.notification;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/** Thông báo Ban quản lý soạn gửi nhân viên / cư dân của một tòa. */
@Getter
@Setter
@AuditTrail(module = "NOTIFICATION", type = "ANNOUNCEMENT", label = "title")
@Entity
@Table(name = "ANNOUNCEMENT")
public class Announcement extends BuildingScopedEntity {

    public enum Category { GENERAL, MAINTENANCE, EVENT, FEE, EMERGENCY }

    public enum Audience {
        STAFF, RESIDENT, ALL;

        public boolean includesStaff() {
            return this != RESIDENT;
        }

        public boolean includesResidents() {
            return this != STAFF;
        }
    }

    /** Nháp → (hẹn giờ) → Đã gửi; đã gửi thì không sửa / xoá được. */
    public enum Status { DRAFT, SCHEDULED, SENT }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "CONTENT", nullable = false, length = 4000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "CATEGORY", nullable = false, length = 20)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "AUDIENCE", nullable = false, length = 20)
    private Audience audience;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "SCHEDULED_AT")
    private OffsetDateTime scheduledAt;

    @Column(name = "SENT_AT")
    private OffsetDateTime sentAt;

    @Column(name = "SENT_BY", length = 100)
    private String sentBy;

    @Column(name = "STAFF_COUNT", nullable = false)
    private int staffCount;

    @Column(name = "RESIDENT_COUNT", nullable = false)
    private int residentCount;

    /** Luôn gán danh sách mới thay vì sửa tại chỗ. */
    @ElementCollection
    @CollectionTable(name = "ANNOUNCEMENT_ATTACHMENT", joinColumns = @JoinColumn(name = "ANNOUNCEMENT_ID"))
    @OrderColumn(name = "POSITION")
    @Column(name = "FILE_ID", nullable = false)
    @BatchSize(size = 50)
    private List<Long> fileIds = new ArrayList<>();
}
