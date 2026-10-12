package com.bihome.ticket;

import com.bihome.common.entity.BaseEntity;
import com.bihome.ticket.TicketEnums.EntryType;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.ticket.TicketEnums.Visibility;
import com.bihome.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/** Một mục trên dòng thời gian (bảng TICKET_COMMENT); người thực hiện = CREATED_BY. */
@Getter
@Setter
@Entity
@Table(name = "TICKET_COMMENT")
public class TicketEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "TICKET_ID", nullable = false, updatable = false)
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    @Column(name = "ENTRY_TYPE", nullable = false, length = 20, updatable = false)
    private EntryType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "VISIBILITY", nullable = false, length = 20)
    private Visibility visibility = Visibility.INTERNAL;

    @Column(name = "CONTENT", length = 4000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "FROM_STATUS", length = 20)
    private TicketStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "TO_STATUS", length = 20)
    private TicketStatus toStatus;

    /** Người được phân công mới (ASSIGNMENT); null = bỏ phân công. */
    @Column(name = "ASSIGNEE_ID")
    private Long assigneeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ASSIGNEE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private AppUser assignee;
}
