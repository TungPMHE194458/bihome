package com.bihome.ticket;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    long countByApartmentId(Long apartmentId);

    long countByResidentId(Long residentId);

    @Override
    @EntityGraph(attributePaths = {"building", "category", "apartment", "resident", "assignee", "assignee.profile"})
    Page<Ticket> findAll(Specification<Ticket> spec, Pageable pageable);
}
