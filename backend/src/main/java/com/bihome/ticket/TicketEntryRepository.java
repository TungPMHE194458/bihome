package com.bihome.ticket;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketEntryRepository extends JpaRepository<TicketEntry, Long> {

    @Query("select e from TicketEntry e left join fetch e.assignee a left join fetch a.profile "
            + "where e.ticket.id = :ticketId order by e.createdAt, e.id")
    List<TicketEntry> findTimeline(@Param("ticketId") Long ticketId);
}
