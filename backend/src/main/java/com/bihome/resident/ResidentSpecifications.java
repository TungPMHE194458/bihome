package com.bihome.resident;

import com.bihome.apartment.Apartment;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.dto.ResidentDtos;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.domain.Specification;

final class ResidentSpecifications {

    private static final Set<ResidenceStatus> ACTIVE = EnumSet.of(ResidenceStatus.LIVING, ResidenceStatus.TEMP_ABSENT);

    private ResidentSpecifications() {
    }

    /** @param buildingScope rỗng = không giới hạn tòa (Admin ở chế độ "Tất cả"). */
    static Specification<Resident> of(ResidentDtos.Filter f, Optional<Set<Long>> buildingScope) {
        return SpecificationBuilder.<Resident>create()
                .likeAny(f.keyword(), "code", "fullName", "phone", "email")
                .like("code", f.code())
                .like("fullName", f.fullName())
                .like("phone", PhoneNumbers.normalize(f.phone()))
                .like("email", f.email())
                .eq("appAccountStatus", f.appAccountStatus())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .dateBetween("updatedAt", f.updatedFrom(), f.updatedTo())
                .and(status(f.residenceStatus()))
                .and(link(f))
                .and(buildingScope.map(ResidentSpecifications::inBuildings).orElse(null))
                .build();
    }

    /** Tình trạng chung của cư dân, tính từ các lần cư trú (xem {@link Resident#overallStatus()}). */
    private static Specification<Resident> status(ResidenceStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> switch (status) {
            case LIVING -> cb.exists(linkWithStatus(root, query, cb, Set.of(ResidenceStatus.LIVING)));
            case TEMP_ABSENT -> cb.and(
                    cb.not(cb.exists(linkWithStatus(root, query, cb, Set.of(ResidenceStatus.LIVING)))),
                    cb.exists(linkWithStatus(root, query, cb, Set.of(ResidenceStatus.TEMP_ABSENT))));
            case MOVED_OUT -> cb.not(cb.exists(linkWithStatus(root, query, cb, ACTIVE)));
        };
    }

    private static Subquery<Long> linkWithStatus(Root<Resident> root, CriteriaQuery<?> query, CriteriaBuilder cb,
                                                 Collection<ResidenceStatus> statuses) {
        Subquery<Long> sq = query.subquery(Long.class);
        Root<ApartmentResident> link = sq.from(ApartmentResident.class);
        return sq.select(link.get("id"))
                .where(cb.equal(link.get("resident"), root), link.get("residenceStatus").in(statuses));
    }

    /** Mọi điều kiện về căn hộ áp lên cùng một lần cư trú; chỉ xét lịch sử khi lọc "Đã chuyển đi". */
    private static Specification<Resident> link(ResidentDtos.Filter f) {
        boolean apartmentText = f.apartment() != null && !f.apartment().isBlank();
        if (f.apartmentId() == null && !apartmentText && f.role() == null && f.tempResidenceRegistered() == null) {
            return null;
        }
        boolean includeHistory = f.residenceStatus() == ResidenceStatus.MOVED_OUT;
        return (root, query, cb) -> {
            Subquery<Long> sq = query.subquery(Long.class);
            Root<ApartmentResident> link = sq.from(ApartmentResident.class);
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(link.get("resident"), root));
            if (!includeHistory) {
                predicates.add(link.get("residenceStatus").in(ACTIVE));
            }
            if (f.apartmentId() != null) {
                predicates.add(cb.equal(link.get("apartmentId"), f.apartmentId()));
            }
            if (apartmentText) {
                Join<ApartmentResident, Apartment> apartment = link.join("apartment");
                String pattern = SpecificationBuilder.likePattern(f.apartment());
                predicates.add(cb.or(cb.like(cb.lower(apartment.get("code")), pattern, '\\'),
                        cb.like(cb.lower(apartment.get("name")), pattern, '\\')));
            }
            if (f.role() != null) {
                predicates.add(cb.equal(link.get("role"), f.role()));
            }
            if (f.tempResidenceRegistered() != null) {
                predicates.add(cb.equal(link.get("tempResidenceRegistered"), f.tempResidenceRegistered()));
            }
            return cb.exists(sq.select(link.get("id")).where(predicates.toArray(Predicate[]::new)));
        };
    }

    private static Specification<Resident> inBuildings(Set<Long> ids) {
        return (root, query, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids);
    }
}
