package com.bihome.ticket;

import com.bihome.common.entity.ActiveStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TicketCategoryRepository
        extends JpaRepository<TicketCategory, Long>, JpaSpecificationExecutor<TicketCategory> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    List<TicketCategory> findByStatusOrderByNameAsc(ActiveStatus status);

    @Override
    @EntityGraph(attributePaths = {"defaultAssignee", "defaultAssignee.profile"})
    Page<TicketCategory> findAll(Specification<TicketCategory> spec, Pageable pageable);
}
