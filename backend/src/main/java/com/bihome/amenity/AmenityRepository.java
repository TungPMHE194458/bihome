package com.bihome.amenity;

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

public interface AmenityRepository extends JpaRepository<Amenity, Long>, JpaSpecificationExecutor<Amenity> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    List<Amenity> findByBuildingIdAndStatusOrderByNameAsc(Long buildingId, ActiveStatus status);

    List<Amenity> findByIdIn(Collection<Long> ids);

    /** Số voucher đang chỉ định tiện ích (chặn xoá). */
    @Query(value = "SELECT COUNT(*) FROM VOUCHER_AMENITY WHERE AMENITY_ID = :id", nativeQuery = true)
    long countVoucherTargets(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = "building")
    Page<Amenity> findAll(Specification<Amenity> spec, Pageable pageable);
}
