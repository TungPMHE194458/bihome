package com.bihome.asset;

import com.bihome.common.entity.ActiveStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetItemRepository extends JpaRepository<AssetItem, Long>, JpaSpecificationExecutor<AssetItem> {

    long countByApartmentId(Long apartmentId);

    long countByCategoryId(Long categoryId);

    /** Số hạng mục đang hoạt động theo căn × danh mục: [apartmentId, categoryId, count] (tính phí gửi xe). */
    @Query("select i.apartmentId, i.categoryId, count(i) from AssetItem i where i.apartmentId in :apartmentIds "
            + "and i.status = com.bihome.common.entity.ActiveStatus.ACTIVE group by i.apartmentId, i.categoryId")
    List<Object[]> countActiveByCategory(@Param("apartmentIds") Collection<Long> apartmentIds);

    @Query("select count(i) > 0 from AssetItem i where i.buildingId = :buildingId and i.plateNumber = :plate "
            + "and i.status = :status and (:excludeId is null or i.id <> :excludeId)")
    boolean existsActivePlate(@Param("buildingId") Long buildingId, @Param("plate") String plate,
                              @Param("status") ActiveStatus status, @Param("excludeId") Long excludeId);

    @Override
    @EntityGraph(attributePaths = {"apartment", "apartment.building", "category"})
    Page<AssetItem> findAll(Specification<AssetItem> spec, Pageable pageable);

    /** Job hằng ngày: hạng mục đã tới ngày ra thì chuyển Không hoạt động. */
    @Modifying
    @Query("update AssetItem i set i.status = :inactive, i.updatedAt = :now, i.updatedBy = 'system', "
            + "i.version = i.version + 1 where i.status = :active and i.exitDate <= :today")
    int deactivateExited(@Param("today") LocalDate today, @Param("now") OffsetDateTime now,
                         @Param("active") ActiveStatus active, @Param("inactive") ActiveStatus inactive);
}
