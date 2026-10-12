package com.bihome.accesscard;

import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
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

public interface AccessCardRepository extends JpaRepository<AccessCard, Long>, JpaSpecificationExecutor<AccessCard> {

    boolean existsByCardNo(String cardNo);

    boolean existsByCardNoAndIdNot(String cardNo, Long id);

    long countByApartmentId(Long apartmentId);

    long countByResidentId(Long residentId);

    long countByAssetItemId(Long assetItemId);

    /** Thẻ đang dùng / khoá của hạng mục xe (bỏ qua thẻ {@code excludeId}). */
    @Query("select count(c) > 0 from AccessCard c where c.assetItemId = :itemId and c.status in :statuses "
            + "and (:excludeId is null or c.id <> :excludeId)")
    boolean existsActiveForItem(@Param("itemId") Long itemId, @Param("statuses") Collection<CardStatus> statuses,
                                @Param("excludeId") Long excludeId);

    /** Thẻ của cư dân tại các căn hộ (dùng khi chuyển đi). */
    @Query("select c from AccessCard c where c.residentId = :residentId and c.apartmentId in :apartmentIds "
            + "and c.status in :statuses")
    List<AccessCard> findAssignedTo(@Param("residentId") Long residentId,
                                    @Param("apartmentIds") Collection<Long> apartmentIds,
                                    @Param("statuses") Collection<CardStatus> statuses);

    /** Thẻ đang gán cho cư dân không còn ở căn của thẻ (vd chuyển đi bởi job theo ngày). */
    @Query("select c from AccessCard c where c.residentId is not null and c.status in :statuses and not exists ("
            + "select 1 from ApartmentResident ar where ar.resident.id = c.residentId and ar.apartmentId = c.apartmentId "
            + "and ar.residenceStatus <> :moved)")
    List<AccessCard> findOrphaned(@Param("statuses") Collection<CardStatus> statuses,
                                  @Param("moved") ResidenceStatus moved);

    @Override
    @EntityGraph(attributePaths = {"building", "apartment", "resident", "assetItem"})
    Page<AccessCard> findAll(Specification<AccessCard> spec, Pageable pageable);
}
