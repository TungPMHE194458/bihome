package com.bihome.survey;

import com.bihome.apartment.Apartment;
import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.BaseEntity;
import com.bihome.resident.Resident;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/** Một lượt trả lời; khảo sát ẩn danh không lưu căn hộ / cư dân. */
@Getter
@Setter
@Entity
// Câu trả lời không ghi chi tiết ("N mục") — khảo sát ẩn danh không được lộ nội dung qua lịch sử.
@AuditTrail(module = "SURVEY", type = "SURVEY_RESPONSE", ignore = "answers",
        buildingSql = "SELECT BUILDING_ID FROM SURVEY WHERE ID = ?", buildingKey = "surveyId")
@Table(name = "SURVEY_RESPONSE")
public class SurveyResponse extends BaseEntity {

    @Column(name = "SURVEY_ID", nullable = false, updatable = false)
    private Long surveyId;

    @Column(name = "APARTMENT_ID", updatable = false)
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "RESIDENT_ID", updatable = false)
    private Long residentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RESIDENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Resident resident;

    @Column(name = "SUBMITTED_AT", nullable = false, updatable = false)
    private OffsetDateTime submittedAt;

    @OneToMany(mappedBy = "response", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<SurveyAnswer> answers = new ArrayList<>();
}
