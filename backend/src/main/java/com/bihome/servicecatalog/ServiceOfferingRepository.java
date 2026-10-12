package com.bihome.servicecatalog;

import com.bihome.common.entity.ActiveStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServiceOfferingRepository
        extends JpaRepository<ServiceOffering, Long>, JpaSpecificationExecutor<ServiceOffering> {

    boolean existsByBuildingIdAndCode(Long buildingId, String code);

    boolean existsByBuildingIdAndCodeAndIdNot(Long buildingId, String code, Long id);

    List<ServiceOffering> findByBuildingIdAndStatusOrderByNameAsc(Long buildingId, ActiveStatus status);

    List<ServiceOffering> findByIdIn(Collection<Long> ids);

    /** Số lớn nhất trong mã tự sinh DV + 4 số của tòa. */
    @Query(value = "SELECT MAX(TO_NUMBER(SUBSTR(CODE, 3))) FROM SERVICE WHERE BUILDING_ID = :buildingId "
            + "AND REGEXP_LIKE(CODE, '^DV[0-9]{4,9}$')", nativeQuery = true)
    Long findMaxGeneratedNumber(@Param("buildingId") Long buildingId);

    @Query(value = "SELECT COUNT(*) FROM VOUCHER_SERVICE WHERE SERVICE_ID = :id", nativeQuery = true)
    long countVoucherTargets(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = {"building", "serviceType"})
    Page<ServiceOffering> findAll(Specification<ServiceOffering> spec, Pageable pageable);
}
