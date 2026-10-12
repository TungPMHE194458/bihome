package com.bihome.ticket;

import com.bihome.audit.AuditTrail;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.Resident;
import com.bihome.ticket.TicketEnums.TicketChannel;
import com.bihome.ticket.TicketEnums.TicketPriority;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.user.AppUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@AuditTrail(module = "TICKET", type = "TICKET", label = {"code", "title"})
@Entity
@Table(name = "TICKET")
public class Ticket extends BuildingScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 30, updatable = false)
    private String code;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "DESCRIPTION", length = 4000)
    private String description;

    @Column(name = "CATEGORY_ID", nullable = false)
    private Long categoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CATEGORY_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private TicketCategory category;

    @Column(name = "APARTMENT_ID")
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "RESIDENT_ID")
    private Long residentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RESIDENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Resident resident;

    @Enumerated(EnumType.STRING)
    @Column(name = "CHANNEL", nullable = false, length = 20)
    private TicketChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(name = "PRIORITY", nullable = false, length = 20)
    private TicketPriority priority;

    @Column(name = "ASSIGNEE_ID")
    private Long assigneeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ASSIGNEE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private AppUser assignee;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private TicketStatus status;

    @Column(name = "RESPONSE_DUE_AT", nullable = false)
    private OffsetDateTime responseDueAt;

    @Column(name = "RESOLUTION_DUE_AT", nullable = false)
    private OffsetDateTime resolutionDueAt;

    @Column(name = "RESPONDED_AT")
    private OffsetDateTime respondedAt;

    @Column(name = "RESOLVED_AT")
    private OffsetDateTime resolvedAt;

    @Column(name = "CLOSED_AT")
    private OffsetDateTime closedAt;

    @Column(name = "RATING")
    private Integer rating;

    @Column(name = "RATING_COMMENT", length = 1000)
    private String ratingComment;

    /** Tệp đính kèm của yêu cầu và của các bình luận (phân biệt bằng {@code entryId}). */
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    @BatchSize(size = 50)
    private List<TicketAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<TicketEntry> entries = new ArrayList<>();

    /** Quá hạn: chưa phản hồi quá hạn phản hồi, hoặc chưa xong quá hạn xử lý. */
    public boolean isOverdue(OffsetDateTime now) {
        if (!TicketStatus.OPEN.contains(status)) {
            return false;
        }
        return resolutionDueAt.isBefore(now) || (status == TicketStatus.NEW && responseDueAt.isBefore(now));
    }
}
