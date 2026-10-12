package com.bihome.building;

import com.bihome.building.dto.BuildingDtos;
import com.bihome.common.web.SpecificationBuilder;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class BuildingSpecifications {

    private BuildingSpecifications() {
    }

    /** @param accessible rỗng = không giới hạn (Admin hệ thống); ngược lại chỉ các tòa được gán. */
    static Specification<Building> of(BuildingDtos.Filter f, Optional<Set<Long>> accessible) {
        return SpecificationBuilder.<Building>create()
                .likeAny(f.keyword(), "code", "name", "province", "ward", "addressDetail")
                .like("code", f.code())
                .like("name", f.name())
                .likeAny(f.location(), "province", "ward", "addressDetail")
                .eq("type", f.type())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .and(accessible.map(BuildingSpecifications::idIn).orElse(null))
                .build();
    }

    private static Specification<Building> idIn(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("id").in(ids);
    }
}
