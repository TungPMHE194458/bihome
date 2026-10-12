package com.bihome.resident;

import com.bihome.audit.AuditTrail;
import com.bihome.apartment.Apartment;
import com.bihome.common.entity.BaseEntity;
import com.bihome.resident.ResidentEnums.Relationship;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.type.NumericBooleanConverter;

/** Một lần cư trú của cư dân tại một căn hộ; chuyển đi thì giữ lại làm lịch sử (RESIDENCE_STATUS = MOVED_OUT). */
@Getter
@Setter
@AuditTrail(module = "RESIDENT", type = "APARTMENT_RESIDENT", label = {"resident", "apartmentId"},
        buildingSql = "SELECT BUILDING_ID FROM APARTMENT WHERE ID = ?", buildingKey = "apartmentId")
@Entity
@Table(name = "APARTMENT_RESIDENT")
public class ApartmentResident extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "RESIDENT_ID", nullable = false, updatable = false)
    private Resident resident;

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Enumerated(EnumType.STRING)
    @Column(name = "RESIDENT_ROLE", nullable = false, length = 30)
    private ResidentRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "RELATIONSHIP", length = 30)
    private Relationship relationship;

    /** Chủ hộ chính: tối đa một người (vai trò OWNER, chưa chuyển đi) mỗi căn hộ. */
    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "IS_PRIMARY", nullable = false)
    private boolean householdHead;

    @Column(name = "MOVE_IN_DATE", nullable = false)
    private LocalDate moveInDate;

    @Column(name = "MOVE_OUT_DATE")
    private LocalDate moveOutDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "RESIDENCE_STATUS", nullable = false, length = 30)
    private ResidenceStatus residenceStatus;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "TEMP_RESIDENCE_REGISTERED", nullable = false)
    private boolean tempResidenceRegistered;

    public boolean isActive() {
        return residenceStatus != ResidenceStatus.MOVED_OUT;
    }
}
