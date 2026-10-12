package com.bihome.accesscard;

import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.common.web.SpecificationBuilder;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class AccessCardSpecifications {

    private AccessCardSpecifications() {
    }

    static Specification<AccessCard> of(AccessCardDtos.Filter f, Optional<Set<Long>> buildingScope, LocalDate today) {
        return SpecificationBuilder.<AccessCard>create()
                .like("cardNo", f.keyword() == null ? null : f.keyword().replaceAll("\\s+", "").toUpperCase(Locale.ROOT))
                .like("cardNo", f.cardNo() == null ? null : f.cardNo().replaceAll("\\s+", ""))
                .eq("cardType", f.cardType())
                .eq("apartmentId", f.apartmentId())
                .likeAny(f.apartment(), "apartment.code", "apartment.name")
                .eq("residentId", f.residentId())
                .like("resident.fullName", f.resident())
                .eq("assetItemId", f.assetItemId())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(Boolean.TRUE.equals(f.expired())
                        ? (root, q, cb) -> cb.lessThan(root.get("expiryDate"), today) : null)
                .and(buildingScope.map(AccessCardSpecifications::inBuildings).orElse(null))
                .build();
    }

    private static Specification<AccessCard> inBuildings(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids);
    }
}
