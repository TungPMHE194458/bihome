package com.bihome.user;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Hồ sơ 1–1 với APP_USER, khoá chính chính là USER_ID; tạo cùng lúc với user. */
@Getter
@Setter
@AuditTrail(module = "USER", type = "USER_PROFILE", label = "fullName")
@Entity
@Table(name = "USER_PROFILE")
public class UserProfile extends AuditableEntity {

    @Id
    @Column(name = "USER_ID")
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "USER_ID")
    private AppUser user;

    @Column(name = "FULL_NAME", nullable = false, length = 150)
    private String fullName;

    @Column(name = "AVATAR_FILE_ID")
    private Long avatarFileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "GENDER", length = 10)
    private Gender gender;

    @Column(name = "DATE_OF_BIRTH")
    private LocalDate dateOfBirth;

    @Column(name = "JOB_TITLE", length = 100)
    private String jobTitle;

    @Column(name = "DEPARTMENT", length = 100)
    private String department;

    @Column(name = "ADDRESS", length = 500)
    private String address;

    @Column(name = "BIO", length = 1000)
    private String bio;
}
