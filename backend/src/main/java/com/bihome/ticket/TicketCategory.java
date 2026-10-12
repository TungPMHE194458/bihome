package com.bihome.ticket;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BaseEntity;
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
import org.hibernate.annotations.Formula;

/** Danh mục yêu cầu dùng chung cho mọi tòa, kèm SLA và người phụ trách mặc định. */
@Getter
@Setter
@AuditTrail(module = "TICKET", type = "TICKET_CATEGORY", label = "name")
@Entity
@Table(name = "TICKET_CATEGORY")
public class TicketCategory extends BaseEntity {

    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    @Column(name = "DESCRIPTION", length = 1000)
    private String description;

    @Column(name = "RESPONSE_SLA_HOURS", nullable = false)
    private int responseSlaHours;

    @Column(name = "RESOLUTION_SLA_HOURS", nullable = false)
    private int resolutionSlaHours;

    @Column(name = "DEFAULT_ASSIGNEE_ID")
    private Long defaultAssigneeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DEFAULT_ASSIGNEE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private AppUser defaultAssignee;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    /** Số yêu cầu (mọi tòa) thuộc danh mục; dùng được trong sắp xếp ("ticketCount"). */
    @Formula("(select count(*) from TICKET t where t.CATEGORY_ID = ID)")
    @Setter(AccessLevel.NONE)
    private long ticketCount;
}
