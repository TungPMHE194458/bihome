package com.bihome.resident;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResidentRepository extends JpaRepository<Resident, Long>, JpaSpecificationExecutor<Resident> {

    boolean existsByBuildingIdAndPhone(Long buildingId, String phone);

    Optional<Resident> findByBuildingIdAndPhone(Long buildingId, String phone);

    boolean existsByBuildingIdAndPhoneAndIdNot(Long buildingId, String phone, Long id);

    boolean existsByBuildingIdAndCode(Long buildingId, String code);

    boolean existsByBuildingIdAndCodeAndIdNot(Long buildingId, String code, Long id);

    @Query("select r.phone from Resident r where r.buildingId = :buildingId and r.phone in :phones")
    List<String> findExistingPhones(@Param("buildingId") Long buildingId, @Param("phones") Collection<String> phones);

    @Query("select r.code from Resident r where r.buildingId = :buildingId and r.code in :codes")
    List<String> findExistingCodes(@Param("buildingId") Long buildingId, @Param("codes") Collection<String> codes);

    /** Mã tự sinh lớn nhất dạng CD + 6 số trong tòa (chuỗi cùng độ dài nên so sánh chuỗi là đúng thứ tự số). */
    @Query(value = "SELECT MAX(CODE) FROM RESIDENT WHERE BUILDING_ID = :buildingId AND REGEXP_LIKE(CODE, '^CD[0-9]{6}$')",
            nativeQuery = true)
    String findMaxGeneratedCode(@Param("buildingId") Long buildingId);

    @Override
    @EntityGraph(attributePaths = "building")
    Page<Resident> findAll(Specification<Resident> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "building")
    List<Resident> findAll(Specification<Resident> spec, Sort sort);
}
