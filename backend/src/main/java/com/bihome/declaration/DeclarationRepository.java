package com.bihome.declaration;

import com.bihome.declaration.Declaration.Status;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeclarationRepository extends JpaRepository<Declaration, Long>, JpaSpecificationExecutor<Declaration> {

    @EntityGraph(attributePaths = {"apartment", "submittedBy", "category"})
    List<Declaration> findByApartmentIdOrderByCreatedAtDescIdDesc(Long apartmentId);

    @Query("select count(d) > 0 from Declaration d where d.apartmentId = :apartmentId and d.status = :status "
            + "and d.type = com.bihome.declaration.Declaration.Type.MEMBER and d.phone = :phone")
    boolean existsPendingMember(@Param("apartmentId") Long apartmentId, @Param("phone") String phone,
                                @Param("status") Status status);

    @Query("select count(d) > 0 from Declaration d where d.apartmentId = :apartmentId and d.status = :status "
            + "and d.type = com.bihome.declaration.Declaration.Type.VEHICLE and d.plateNumber = :plate")
    boolean existsPendingVehicle(@Param("apartmentId") Long apartmentId, @Param("plate") String plate,
                                 @Param("status") Status status);

    long countByBuildingIdAndStatus(Long buildingId, Status status);
}
