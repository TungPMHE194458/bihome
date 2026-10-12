package com.bihome.survey;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Câu trả lời: một dòng cho mỗi lựa chọn được chọn, hoặc văn bản, hoặc số sao. */
@Getter
@Setter
@Entity
@Table(name = "SURVEY_ANSWER")
public class SurveyAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "RESPONSE_ID", nullable = false, updatable = false)
    private SurveyResponse response;

    @Column(name = "QUESTION_ID", nullable = false, updatable = false)
    private Long questionId;

    @Column(name = "OPTION_ID", updatable = false)
    private Long optionId;

    @Column(name = "TEXT_VALUE", length = 2000, updatable = false)
    private String textValue;

    @Column(name = "RATING", updatable = false)
    private Integer rating;
}
