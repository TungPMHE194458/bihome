package com.bihome.declaration;

import com.bihome.apartment.Apartment;
import com.bihome.asset.AssetCategory;
import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.IdDocumentType;
import com.bihome.resident.ResidentEnums.Relationship;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.user.Gender;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/**
 * Phiếu kê khai từ app cư dân: thành viên gia đình hoặc xe của căn hộ. Chờ duyệt → BQL duyệt (tạo cư dân / gắn cư
 * dân sẵn có vào căn, hoặc tạo hạng mục xe) hoặc từ chối (bắt buộc lý do); người gửi huỷ được khi còn chờ duyệt.
 */
@Getter
@Setter
@AuditTrail(module = "RESIDENT", type = "RESIDENT_DECLARATION", label = {"code"}, mask = "idNumber")
@Entity
@Table(name = "RESIDENT_DECLARATION")
public class Declaration extends BuildingScopedEntity {

    public enum Type { MEMBER, VEHICLE }

    public enum Status { PENDING, APPROVED, REJECTED, CANCELLED }

    @Column(name = "APARTMENT_ID", nullable = false, updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "CODE", nullable = false, updatable = false, length = 20)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "DECLARATION_TYPE", nullable = false, updatable = false, length = 20)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "SUBMITTED_BY_ID", nullable = false, updatable = false)
    private Long submittedById;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SUBMITTED_BY_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Resident submittedBy;

    // ---------------------------------------------------------------- Thành viên

    @Column(name = "FULL_NAME", length = 150)
    private String fullName;

    @Column(name = "PHONE", length = 20)
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

    @Enumerated(EnumType.STRING)
    @Column(name = "RESIDENT_ROLE", length = 30)
    private ResidentRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "RELATIONSHIP", length = 30)
    private Relationship relationship;

    @Column(name = "MOVE_IN_DATE")
    private LocalDate moveInDate;

    @Column(name = "PHOTO_FILE_ID")
    private Long photoFileId;

    // ---------------------------------------------------------------- Xe

    @Column(name = "CATEGORY_ID")
    private Long categoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CATEGORY_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private AssetCategory category;

    @Column(name = "VEHICLE_NAME", length = 150)
    private String vehicleName;

    @Column(name = "PLATE_NUMBER", length = 30)
    private String plateNumber;

    @Column(name = "VEHICLE_DESCRIPTION", length = 1000)
    private String vehicleDescription;

    // ---------------------------------------------------------------- Xử lý

    @Column(name = "NOTE", length = 1000)
    private String note;

    @Column(name = "REVIEWED_AT")
    private OffsetDateTime reviewedAt;

    @Column(name = "REVIEWED_BY", length = 100)
    private String reviewedBy;

    @Column(name = "REJECT_REASON", length = 500)
    private String rejectReason;

    @Column(name = "RESULT_RESIDENT_ID")
    private Long resultResidentId;

    @Column(name = "RESULT_ASSET_ITEM_ID")
    private Long resultAssetItemId;
}
