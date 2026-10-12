package com.bihome.survey;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.hibernate.type.NumericBooleanConverter;

@Getter
@Setter
@Entity
@Table(name = "SURVEY_QUESTION")
public class SurveyQuestion {

    public enum Type {
        SINGLE, MULTIPLE, TEXT, RATING;

        public boolean hasOptions() {
            return this == SINGLE || this == MULTIPLE;
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "SURVEY_ID", nullable = false, updatable = false)
    private Survey survey;

    @Column(name = "POSITION", nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(name = "TYPE_CODE", nullable = false, length = 20)
    private Type type;

    @Column(name = "CONTENT", nullable = false, length = 500)
    private String content;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "REQUIRED", nullable = false)
    private boolean required;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    @BatchSize(size = 50)
    private List<SurveyOption> options = new ArrayList<>();
}
