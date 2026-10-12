package com.bihome.document;

import com.bihome.common.web.SpecificationBuilder;
import com.bihome.document.dto.DocumentDtos;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class DocumentSpecifications {

    private DocumentSpecifications() {
    }

    static Specification<DocumentCategory> categories(DocumentDtos.CategoryFilter f) {
        return SpecificationBuilder.<DocumentCategory>create()
                .likeAny(f.keyword(), "name", "description")
                .like("name", f.name())
                .like("description", f.description())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .build();
    }

    /** @param buildingScope rỗng = không giới hạn tòa (Admin ở chế độ "Tất cả"). */
    static Specification<Document> documents(DocumentDtos.Filter f, Optional<Set<Long>> buildingScope) {
        return SpecificationBuilder.<Document>create()
                .likeAny(f.keyword(), "code", "name", "description")
                .like("code", f.code())
                .like("name", f.name())
                .like("description", f.description())
                .eq("categoryId", f.categoryId())
                .eq("audience", f.audience())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .and(hasTag(f.tag()))
                .and(buildingScope.map(DocumentSpecifications::inBuildings).orElse(null))
                .build();
    }

    /** Subquery thay vì join để không nhân bản dòng (và số đếm) khi tài liệu có nhiều thẻ khớp. */
    private static Specification<Document> hasTag(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = SpecificationBuilder.likePattern(keyword);
        return (root, query, cb) -> {
            Subquery<Long> sq = query.subquery(Long.class);
            Root<Document> doc = sq.from(Document.class);
            Join<Document, String> tag = doc.join("tags");
            return cb.exists(sq.select(doc.get("id"))
                    .where(cb.equal(doc, root), cb.like(cb.lower(tag), pattern, '\\')));
        };
    }

    private static Specification<Document> inBuildings(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids);
    }
}
