package com.bihome.survey;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.ResidentAudienceService.Audience;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Formula;
import org.hibernate.type.NumericBooleanConverter;

/** Khảo sát ý kiến cư dân: câu hỏi một / nhiều lựa chọn, văn bản ngắn, đánh giá 1–5 sao. */
@Getter
@Setter
@AuditTrail(module = "SURVEY", type = "SURVEY", label = "title", ignore = "questions")
@Entity
@Table(name = "SURVEY")
public class Survey extends BuildingScopedEntity {

    /** Nháp → Đang mở (nhận phản hồi trong thời gian khảo sát) → Đã đóng (thủ công hoặc khi hết giờ). */
    public enum Status { DRAFT, OPEN, CLOSED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "DESCRIPTION", length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "AUDIENCE", nullable = false, length = 20)
    private Audience audience;

    @ElementCollection
    @CollectionTable(name = "SURVEY_TARGET", joinColumns = @JoinColumn(name = "SURVEY_ID"))
    @Column(name = "TARGET_VALUE", nullable = false, length = 40)
    @BatchSize(size = 50)
    private Set<String> targets = new LinkedHashSet<>();

    @Column(name = "START_AT", nullable = false)
    private OffsetDateTime startAt;

    @Column(name = "END_AT", nullable = false)
    private OffsetDateTime endAt;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "ANONYMOUS", nullable = false)
    private boolean anonymous;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private Status status;

    @Column(name = "PUBLISHED_AT")
    private OffsetDateTime publishedAt;

    @Column(name = "CLOSED_AT")
    private OffsetDateTime closedAt;

    @OneToMany(mappedBy = "survey", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    @BatchSize(size = 50)
    private List<SurveyQuestion> questions = new ArrayList<>();

    @Formula("(select count(*) from SURVEY_RESPONSE r where r.SURVEY_ID = ID)")
    @Setter(AccessLevel.NONE)
    private long responseCount;
}
