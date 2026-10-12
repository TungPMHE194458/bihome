package com.bihome.ticket;

import com.bihome.common.web.SpecificationBuilder;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.ticket.dto.TicketDtos;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class TicketSpecifications {

    private TicketSpecifications() {
    }

    static Specification<TicketCategory> categories(TicketDtos.CategoryFilter f) {
        return SpecificationBuilder.<TicketCategory>create()
                .likeAny(f.keyword(), "name", "description")
                .like("name", f.name())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .build();
    }

    /**
     * @param buildingScope rỗng = không giới hạn tòa
     * @param status        trạng thái cụ thể (Kanban truyền theo từng cột, bỏ qua filter.status)
     */
    static Specification<Ticket> tickets(TicketDtos.Filter f, Optional<Set<Long>> buildingScope, TicketStatus status,
                                         OffsetDateTime now) {
        return SpecificationBuilder.<Ticket>create()
                .likeAny(f.keyword(), "code", "title", "description")
                .like("code", f.code())
                .like("title", f.title())
                .eq("categoryId", f.categoryId())
                .eq("apartmentId", f.apartmentId())
                .likeAny(f.apartment(), "apartment.code", "apartment.name")
                .eq("residentId", f.residentId())
                .eq("priority", f.priority())
                .eq("channel", f.channel())
                .eq("assigneeId", f.assigneeId())
                .eq("status", status)
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .and(Boolean.TRUE.equals(f.unassigned()) ? (root, q, cb) -> cb.isNull(root.get("assigneeId")) : null)
                .and(Boolean.TRUE.equals(f.overdue()) ? overdue(now) : null)
                .and(buildingScope.map(TicketSpecifications::inBuildings).orElse(null))
                .build();
    }

    /** Cùng điều kiện với {@link Ticket#isOverdue}. */
    static Specification<Ticket> overdue(OffsetDateTime now) {
        return (root, query, cb) -> cb.and(
                root.get("status").in(TicketStatus.OPEN),
                cb.or(cb.lessThan(root.get("resolutionDueAt"), now),
                        cb.and(cb.equal(root.get("status"), TicketStatus.NEW),
                                cb.lessThan(root.get("responseDueAt"), now))));
    }

    static Specification<Ticket> inBuildings(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids);
    }
}
