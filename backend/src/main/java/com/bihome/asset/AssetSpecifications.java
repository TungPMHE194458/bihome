package com.bihome.asset;

import com.bihome.asset.dto.AssetDtos;
import com.bihome.common.web.SpecificationBuilder;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class AssetSpecifications {

    private AssetSpecifications() {
    }

    static Specification<AssetCategory> categories(AssetDtos.CategoryFilter f, Optional<Set<Long>> scope) {
        return SpecificationBuilder.<AssetCategory>create()
                .likeAny(f.keyword(), "name", "description")
                .like("name", f.name())
                .like("unit", f.unit())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .and(scope.map(AssetSpecifications::<AssetCategory>inBuildings).orElse(null))
                .build();
    }

    static Specification<AssetItem> items(AssetDtos.ItemFilter f, Optional<Set<Long>> scope) {
        return SpecificationBuilder.<AssetItem>create()
                .likeAny(f.keyword(), "name", "plateNumber", "apartment.code", "apartment.name")
                .eq("apartmentId", f.apartmentId())
                .likeAny(f.apartment(), "apartment.code", "apartment.name")
                .like("name", f.name())
                .like("plateNumber", f.plateNumber())
                .like("accessCardNo", f.accessCardNo())
                .eq("categoryId", f.categoryId())
                .eq("category.name", f.categoryName() == null || f.categoryName().isBlank() ? null : f.categoryName().trim())
                .eq("status", f.status())
                .localDateBetween("entryDate", f.entryFrom(), f.entryTo())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .and(scope.map(AssetSpecifications::<AssetItem>inBuildings).orElse(null))
                .build();
    }

    private static <T> Specification<T> inBuildings(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids);
    }
}
