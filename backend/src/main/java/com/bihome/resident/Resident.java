package com.bihome.resident;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.ResidentEnums.AppAccountStatus;
import com.bihome.resident.ResidentEnums.IdDocumentType;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.user.Gender;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@AuditTrail(module = "RESIDENT", type = "RESIDENT", label = {"code", "fullName"})
@Entity
@Table(name = "RESIDENT")
public class Resident extends BuildingScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 20)
    private String code;

    @Column(name = "FULL_NAME", nullable = false, length = 150)
    private String fullName;

    /** Đã chuẩn hoá (0xxxxxxxxx), duy nhất trong tòa. */
    @Column(name = "PHONE", nullable = false, length = 20)
    private String phone;

    @Column(name = "EMAIL", length = 150)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "GENDER", length = 10)
    private Gender gender;

    @Column(name = "DATE_OF_BIRTH")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "ID_TYPE", length = 20)
    private IdDocumentType idType;

    @Column(name = "ID_NUMBER", length = 20)
    private String idNumber;

    @Column(name = "ID_ISSUE_DATE")
    private LocalDate idIssueDate;

    @Column(name = "ID_ISSUE_PLACE", length = 200)
    private String idIssuePlace;

    @Column(name = "NATIONALITY", length = 100)
    private String nationality;

    @Column(name = "AVATAR_FILE_ID")
    private Long avatarFileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "APP_ACCOUNT_STATUS", nullable = false, length = 20)
    private AppAccountStatus appAccountStatus;

    @Column(name = "NOTE", length = 1000)
    private String note;

    @OneToMany(mappedBy = "resident", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    @BatchSize(size = 50)
    private List<ApartmentResident> apartments = new ArrayList<>();

    public List<ApartmentResident> activeLinks() {
        return apartments.stream().filter(ApartmentResident::isActive).toList();
    }

    /** Đang ở nếu còn ở ít nhất một căn; chỉ còn tạm vắng → tạm vắng; không còn căn nào → đã chuyển đi. */
    public ResidenceStatus overallStatus() {
        List<ApartmentResident> active = activeLinks();
        if (active.stream().anyMatch(l -> l.getResidenceStatus() == ResidenceStatus.LIVING)) {
            return ResidenceStatus.LIVING;
        }
        return active.isEmpty() ? ResidenceStatus.MOVED_OUT : ResidenceStatus.TEMP_ABSENT;
    }
}
