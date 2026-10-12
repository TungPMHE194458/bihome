package com.bihome.survey;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, Long> {

    @EntityGraph(attributePaths = {"apartment", "resident"})
    Page<SurveyResponse> findBySurveyIdOrderBySubmittedAtDesc(Long surveyId, Pageable pageable);

    @EntityGraph(attributePaths = {"apartment", "resident", "answers"})
    @Query("select r from SurveyResponse r where r.surveyId = :surveyId order by r.submittedAt, r.id")
    List<SurveyResponse> findAllWithAnswers(@Param("surveyId") Long surveyId);

    boolean existsBySurveyIdAndResidentId(Long surveyId, Long residentId);

    long countBySurveyId(Long surveyId);

    long countByApartmentId(Long apartmentId);

    long countByResidentId(Long residentId);

    /** [questionId, optionId, số lượt chọn] của khảo sát. */
    @Query("select a.questionId, a.optionId, count(a) from SurveyAnswer a where a.response.surveyId = :surveyId "
            + "and a.optionId is not null group by a.questionId, a.optionId")
    List<Object[]> countOptions(@Param("surveyId") Long surveyId);

    /** [questionId, số sao, số lượt] của câu đánh giá. */
    @Query("select a.questionId, a.rating, count(a) from SurveyAnswer a where a.response.surveyId = :surveyId "
            + "and a.rating is not null group by a.questionId, a.rating")
    List<Object[]> countRatings(@Param("surveyId") Long surveyId);

    /** [questionId, số phản hồi có trả lời câu đó]. */
    @Query("select a.questionId, count(distinct a.response.id) from SurveyAnswer a where a.response.surveyId = :surveyId "
            + "group by a.questionId")
    List<Object[]> countAnswered(@Param("surveyId") Long surveyId);

    @Query("select a from SurveyAnswer a join fetch a.response r where r.surveyId = :surveyId and a.questionId = :questionId "
            + "and a.textValue is not null order by r.submittedAt desc")
    List<SurveyAnswer> findTexts(@Param("surveyId") Long surveyId, @Param("questionId") Long questionId, Pageable pageable);
}
