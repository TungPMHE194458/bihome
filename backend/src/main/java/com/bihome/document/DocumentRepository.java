package com.bihome.document;

import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<Document, Long>, JpaSpecificationExecutor<Document> {

    boolean existsByBuildingIdAndCode(Long buildingId, String code);

    boolean existsByBuildingIdAndCodeAndIdNot(Long buildingId, String code, Long id);

    boolean existsByFileId(Long fileId);

    /** Số lớn nhất trong các mã chỉ gồm chữ số của tòa (mã tự sinh). */
    @Query(value = "SELECT MAX(TO_NUMBER(CODE)) FROM DOCUMENT WHERE BUILDING_ID = :buildingId "
            + "AND REGEXP_LIKE(CODE, '^[0-9]{1,9}$')", nativeQuery = true)
    Long findMaxNumericCode(@Param("buildingId") Long buildingId);

    /** Thẻ đã dùng trong các tòa {@code buildingIds} khớp mẫu LIKE (gợi ý khi nhập thẻ). */
    @Query("select distinct t from Document d join d.tags t where d.buildingId in :buildingIds "
            + "and lower(t) like :pattern escape '\\' order by t")
    List<String> findTags(@Param("buildingIds") Collection<Long> buildingIds, @Param("pattern") String pattern,
                          Pageable pageable);

    @Query("select distinct t from Document d join d.tags t where lower(t) like :pattern escape '\\' order by t")
    List<String> findAllTags(@Param("pattern") String pattern, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"building", "category", "file"})
    Page<Document> findAll(Specification<Document> spec, Pageable pageable);
}
