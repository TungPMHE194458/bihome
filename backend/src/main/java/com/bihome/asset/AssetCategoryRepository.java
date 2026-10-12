package com.bihome.asset;

import com.bihome.common.entity.ActiveStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssetCategoryRepository extends JpaRepository<AssetCategory, Long>,
        JpaSpecificationExecutor<AssetCategory> {

    boolean existsByBuildingIdAndNameIgnoreCase(Long buildingId, String name);

    boolean existsByBuildingIdAndNameIgnoreCaseAndIdNot(Long buildingId, String name, Long id);

    List<AssetCategory> findByBuildingIdAndStatusOrderByNameAsc(Long buildingId, ActiveStatus status);

    @Override
    @EntityGraph(attributePaths = "building")
    Page<AssetCategory> findAll(Specification<AssetCategory> spec, Pageable pageable);
}
