package com.bihome.apartment;

import com.bihome.common.entity.ActiveStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApartmentRepository extends JpaRepository<Apartment, Long>, JpaSpecificationExecutor<Apartment> {

    boolean existsByBuildingIdAndCode(Long buildingId, String code);

    boolean existsByBuildingIdAndCodeAndIdNot(Long buildingId, String code, Long id);

    @Query("select a.code from Apartment a where a.buildingId = :buildingId and a.code in :codes")
    List<String> findExistingCodes(@Param("buildingId") Long buildingId, @Param("codes") Collection<String> codes);

    List<Apartment> findByBuildingIdAndCodeIn(Long buildingId, Collection<String> codes);

    List<Apartment> findByBuildingIdAndStatusOrderByCodeAsc(Long buildingId, ActiveStatus status);

    @Override
    @EntityGraph(attributePaths = "building")
    Page<Apartment> findAll(Specification<Apartment> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "building")
    List<Apartment> findAll(Specification<Apartment> spec, Sort sort);

    @Query("select distinct a.floorNo from Apartment a where a.buildingId = :buildingId")
    List<String> findDistinctFloors(@Param("buildingId") Long buildingId);
}
