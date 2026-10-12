package com.bihome.survey;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SurveyRepository extends JpaRepository<Survey, Long>, JpaSpecificationExecutor<Survey> {

    @Override
    @EntityGraph(attributePaths = "building")
    Page<Survey> findAll(Specification<Survey> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"building", "questions"})
    @Query("select s from Survey s where s.id = :id")
    Optional<Survey> findWithQuestionsById(@Param("id") Long id);

    @Query("select s.id from Survey s where s.status = 'OPEN' and s.endAt <= :now")
    List<Long> findExpiredIds(@Param("now") OffsetDateTime now);
}
