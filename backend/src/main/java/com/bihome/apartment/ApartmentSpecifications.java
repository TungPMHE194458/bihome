package com.bihome.apartment;

import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.resident.ApartmentResident;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class ApartmentSpecifications {

    private ApartmentSpecifications() {
    }

    /** @param buildingScope rỗng = không giới hạn tòa (Admin ở chế độ "Tất cả"). */
    static Specification<Apartment> of(ApartmentDtos.Filter f, Optional<Set<Long>> buildingScope) {
        return SpecificationBuilder.<Apartment>create()
                .likeAny(f.keyword(), "code", "name")
                .like("code", f.code())
                .like("name", f.name())
                // Tầng so khớp chính xác: lọc "2" không được ra cả tầng 12, 20.
                .eq("floorNo", f.floorNo() == null ? null : f.floorNo().trim().toUpperCase(Locale.ROOT))
                .eq("bedrooms", f.bedrooms())
                .eq("rooms", f.rooms())
                .eq("type", f.type())
                .eq("ownershipType", f.ownershipType())
                .eq("usageStatus", f.usageStatus())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .and(owner(f.owner()))
                .and(buildingScope.map(ApartmentSpecifications::inBuildings).orElse(null))
                .build();
    }

    /** Có chủ sở hữu còn ở căn với tên khớp từ khoá. */
    private static Specification<Apartment> owner(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = SpecificationBuilder.likePattern(keyword);
        return (root, query, cb) -> {
            Subquery<Long> sq = query.subquery(Long.class);
            Root<ApartmentResident> link = sq.from(ApartmentResident.class);
            Join<ApartmentResident, Resident> resident = link.join("resident");
            return cb.exists(sq.select(link.get("id")).where(
                    cb.equal(link.get("apartmentId"), root.get("id")),
                    cb.equal(link.get("role"), ResidentRole.OWNER),
                    cb.notEqual(link.get("residenceStatus"), ResidenceStatus.MOVED_OUT),
                    cb.like(cb.lower(resident.get("fullName")), pattern, '\\')));
        };
    }

    private static Specification<Apartment> inBuildings(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids);
    }
}
