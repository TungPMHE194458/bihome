package com.bihome.residentapp;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResidentAccountRepository extends JpaRepository<ResidentAccount, Long> {

    Optional<ResidentAccount> findByPhone(String phone);

    Optional<ResidentAccount> findByResidentId(Long residentId);

    boolean existsByPhone(String phone);

    @Query("select a.residentId from ResidentAccount a where a.residentId in :residentIds")
    List<Long> findResidentIdsWithAccount(@Param("residentIds") Collection<Long> residentIds);

    /** Cư dân có tài khoản app đang ở căn hộ (chưa chuyển đi). */
    @Query("select distinct a.residentId from ResidentAccount a, ApartmentResident l where l.resident.id = a.residentId "
            + "and l.apartmentId = :apartmentId "
            + "and l.residenceStatus <> com.bihome.resident.ResidentEnums.ResidenceStatus.MOVED_OUT")
    List<Long> findResidentIdsInApartment(@Param("apartmentId") Long apartmentId);

    /** Cư dân có tài khoản app còn ở ít nhất một căn của tòa. */
    @Query("select distinct a.residentId from ResidentAccount a, ApartmentResident l where l.resident.id = a.residentId "
            + "and l.resident.buildingId = :buildingId "
            + "and l.residenceStatus <> com.bihome.resident.ResidentEnums.ResidenceStatus.MOVED_OUT")
    List<Long> findResidentIdsInBuilding(@Param("buildingId") Long buildingId);

    /** Cập nhật thẳng bằng JPQL để không tăng VERSION / ghi lịch sử mỗi lần đăng nhập. */
    @Modifying
    @Query("update ResidentAccount a set a.failedLoginCount = :count, a.lockedUntil = :lockedUntil where a.id = :id")
    int recordFailedLogin(@Param("id") Long id, @Param("count") int count,
                          @Param("lockedUntil") OffsetDateTime lockedUntil);

    @Modifying
    @Query("update ResidentAccount a set a.failedLoginCount = 0, a.lockedUntil = null, a.lastLoginAt = :at where a.id = :id")
    int recordSuccessfulLogin(@Param("id") Long id, @Param("at") OffsetDateTime at);
}
