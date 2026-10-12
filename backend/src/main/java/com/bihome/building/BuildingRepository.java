package com.bihome.building;

import com.bihome.common.entity.ActiveStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BuildingRepository extends JpaRepository<Building, Long>, JpaSpecificationExecutor<Building> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    List<Building> findAllByOrderByNameAsc();

    List<Building> findByIdInAndStatusOrderByNameAsc(Collection<Long> ids, ActiveStatus status);

    @Query("select b.id from Building b where b.id in :ids")
    List<Long> findExistingIds(@Param("ids") Collection<Long> ids);

    /** USER_BUILDING là bảng quyền truy cập (không có entity riêng) nên xoá bằng SQL thuần. */
    @Modifying
    @Query(value = "DELETE FROM USER_BUILDING WHERE BUILDING_ID = :buildingId", nativeQuery = true)
    int deleteUserAssignments(@Param("buildingId") Long buildingId);

    /** Số cư dân còn ở (Đang ở + Tạm vắng) trong tòa. */
    @Query(value = "SELECT COUNT(DISTINCT ar.RESIDENT_ID) FROM APARTMENT_RESIDENT ar "
            + "JOIN APARTMENT a ON a.ID = ar.APARTMENT_ID "
            + "WHERE a.BUILDING_ID = :buildingId AND ar.RESIDENCE_STATUS <> 'MOVED_OUT'", nativeQuery = true)
    long countResidents(@Param("buildingId") Long buildingId);

    /** Số căn có ít nhất một cư dân Đang ở (để tính tỉ lệ có người ở). */
    @Query(value = "SELECT COUNT(DISTINCT ar.APARTMENT_ID) FROM APARTMENT_RESIDENT ar "
            + "JOIN APARTMENT a ON a.ID = ar.APARTMENT_ID "
            + "WHERE a.BUILDING_ID = :buildingId AND ar.RESIDENCE_STATUS = 'LIVING'", nativeQuery = true)
    long countOccupiedApartments(@Param("buildingId") Long buildingId);
}
