package com.bihome.resident;

import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApartmentResidentRepository extends JpaRepository<ApartmentResident, Long> {

    long countByApartmentId(Long apartmentId);

    /** Cư dân của một căn: người đang ở trước, chủ hộ chính đầu tiên; người đã chuyển đi xếp sau cùng. */
    @Query("select ar from ApartmentResident ar join fetch ar.resident where ar.apartmentId = :apartmentId "
            + "order by case when ar.residenceStatus = :moved then 1 else 0 end, ar.householdHead desc, ar.moveInDate")
    List<ApartmentResident> findByApartment(@Param("apartmentId") Long apartmentId,
                                            @Param("moved") ResidenceStatus moved);

    /** Chủ hộ chính đang có của căn (bỏ qua bản ghi {@code excludeId}). */
    @Query("select ar from ApartmentResident ar join fetch ar.resident where ar.apartmentId = :apartmentId "
            + "and ar.householdHead = true and ar.residenceStatus <> :moved and (:excludeId is null or ar.id <> :excludeId)")
    List<ApartmentResident> findActiveHead(@Param("apartmentId") Long apartmentId, @Param("moved") ResidenceStatus moved,
                                           @Param("excludeId") Long excludeId);

    /** [apartmentId, fullName, isHead, linkId] của chủ sở hữu còn ở, để hiện cột "Chủ sở hữu" ở danh sách căn hộ. */
    @Query("select ar.apartmentId, r.fullName, ar.householdHead, ar.id from ApartmentResident ar join ar.resident r "
            + "where ar.apartmentId in :apartmentIds and ar.role = :owner and ar.residenceStatus <> :moved")
    List<Object[]> findOwners(@Param("apartmentIds") Collection<Long> apartmentIds, @Param("owner") ResidentRole owner,
                              @Param("moved") ResidenceStatus moved);

    /** Căn hộ (trong {@code apartmentIds}) đã có chủ hộ chính còn ở. */
    @Query("select ar.apartmentId from ApartmentResident ar where ar.apartmentId in :apartmentIds "
            + "and ar.householdHead = true and ar.residenceStatus <> :moved")
    List<Long> findApartmentsWithActiveHead(@Param("apartmentIds") Collection<Long> apartmentIds,
                                            @Param("moved") ResidenceStatus moved);

    /** Job hằng ngày: lần cư trú đã tới ngày chuyển đi thì chuyển MOVED_OUT và bỏ cờ chủ hộ chính. */
    @Modifying
    @Query("update ApartmentResident ar set ar.residenceStatus = :moved, ar.householdHead = false, "
            + "ar.updatedAt = :now, ar.updatedBy = 'system', ar.version = ar.version + 1 "
            + "where ar.residenceStatus <> :moved and ar.moveOutDate <= :today")
    int moveOutDue(@Param("today") LocalDate today, @Param("now") OffsetDateTime now,
                   @Param("moved") ResidenceStatus moved);
}
