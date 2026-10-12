package com.bihome.servicecatalog;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long>, JpaSpecificationExecutor<ServiceOrder> {

    @Override
    @EntityGraph(attributePaths = {"building", "service", "apartment", "resident", "voucher"})
    Page<ServiceOrder> findAll(Specification<ServiceOrder> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "service", "apartment", "resident", "voucher"})
    Optional<ServiceOrder> findById(Long id);

    long countByServiceId(Long serviceId);

    long countByApartmentId(Long apartmentId);

    long countByResidentId(Long residentId);
}
