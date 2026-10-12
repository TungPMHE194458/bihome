package com.bihome.sos;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SosAlertRepository extends JpaRepository<SosAlert, Long>, JpaSpecificationExecutor<SosAlert> {

    @Override
    @EntityGraph(attributePaths = {"building", "apartment"})
    Page<SosAlert> findAll(Specification<SosAlert> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "apartment"})
    List<SosAlert> findAll(Specification<SosAlert> spec);

    long countByApartmentId(Long apartmentId);
}
