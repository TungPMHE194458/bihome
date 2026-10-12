package com.bihome.resident;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentRepository;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cư dân đang ở (chưa chuyển đi) của một tòa theo đối tượng: toàn tòa, theo tầng, theo căn hộ, cư dân cụ thể. Dùng
 * chung cho nhắc nhở và khảo sát.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentAudienceService {

    public enum Audience { ALL, FLOOR, APARTMENT, RESIDENT }

    /** Một giá trị đối tượng kèm nhãn hiển thị (tầng, mã căn, tên cư dân). */
    public record Target(String value, String label) {
    }

    /** @param apartments mã các căn đang ở (phân cách dấu phẩy) */
    public record Recipient(Long residentId, String fullName, String phone, String email, String apartments) {
    }

    private final EntityManager entityManager;
    private final ApartmentRepository apartments;
    private final ResidentRepository residents;

    public List<Recipient> resolve(Long buildingId, Audience audience, Collection<String> targets) {
        StringBuilder jpql = new StringBuilder("select ar from ApartmentResident ar join fetch ar.resident r "
                + "join fetch ar.apartment a where a.buildingId = :buildingId and ar.residenceStatus <> :moved");
        switch (audience) {
            case FLOOR -> jpql.append(" and a.floorNo in :targets");
            case APARTMENT -> jpql.append(" and a.id in :targets");
            case RESIDENT -> jpql.append(" and r.id in :targets");
            default -> {
            }
        }
        if (audience != Audience.ALL && targets.isEmpty()) {
            return List.of();
        }
        TypedQuery<ApartmentResident> query = entityManager.createQuery(jpql.toString(), ApartmentResident.class)
                .setParameter("buildingId", buildingId)
                .setParameter("moved", ResidenceStatus.MOVED_OUT);
        switch (audience) {
            case FLOOR -> query.setParameter("targets", targets);
            case APARTMENT, RESIDENT -> query.setParameter("targets", ids(targets));
            default -> {
            }
        }
        Map<Long, List<ApartmentResident>> byResident = new LinkedHashMap<>();
        query.getResultList().stream()
                .sorted(Comparator.comparing((ApartmentResident ar) -> ar.getApartment().getCode())
                        .thenComparing(ar -> ar.getResident().getFullName()))
                .forEach(ar -> byResident.computeIfAbsent(ar.getResident().getId(), k -> new ArrayList<>()).add(ar));
        return byResident.values().stream().map(links -> {
            Resident r = links.getFirst().getResident();
            String codes = links.stream().map(l -> l.getApartment().getCode()).distinct().collect(Collectors.joining(", "));
            return new Recipient(r.getId(), r.getFullName(), r.getPhone(), r.getEmail(), codes);
        }).toList();
    }

    /** Kiểm tra giá trị đối tượng thuộc tòa; trả về tập đã chuẩn hoá. Lỗi gắn vào trường {@code field}. */
    public Set<String> validateTargets(Long buildingId, Audience audience, Collection<String> raw, String field) {
        Set<String> targets = raw == null ? new TreeSet<>()
                : raw.stream().filter(v -> v != null && !v.isBlank()).map(String::trim).collect(Collectors.toCollection(TreeSet::new));
        if (audience == Audience.ALL) {
            return new TreeSet<>();
        }
        if (targets.isEmpty()) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, field, switch (audience) {
                case FLOOR -> "Vui lòng chọn ít nhất một tầng.";
                case APARTMENT -> "Vui lòng chọn ít nhất một căn hộ.";
                default -> "Vui lòng chọn ít nhất một cư dân.";
            });
        }
        boolean valid = switch (audience) {
            case FLOOR -> floors(buildingId).containsAll(targets);
            case APARTMENT -> {
                List<Long> ids = ids(targets);
                yield ids.size() == targets.size()
                        && apartments.findAllById(ids).stream().filter(a -> a.getBuildingId().equals(buildingId)).count() == ids.size();
            }
            case RESIDENT -> {
                List<Long> ids = ids(targets);
                yield ids.size() == targets.size()
                        && residents.findAllById(ids).stream().filter(r -> r.getBuildingId().equals(buildingId)).count() == ids.size();
            }
            default -> true;
        };
        if (!valid) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, field, "Có đối tượng nhận không thuộc tòa nhà.");
        }
        return targets;
    }

    /** Nhãn của các giá trị đối tượng (giữ thứ tự tầng / mã căn / tên). */
    public List<Target> describe(Audience audience, Collection<String> targets) {
        return switch (audience) {
            case ALL -> List.of();
            case FLOOR -> targets.stream().sorted(Comparator.comparing((String f) -> f.matches("\\d+") ? Integer.parseInt(f) : Integer.MAX_VALUE))
                    .map(f -> new Target(f, "Tầng " + f)).toList();
            case APARTMENT -> apartments.findAllById(ids(targets)).stream()
                    .sorted(Comparator.comparing(Apartment::getCode))
                    .map(a -> new Target(String.valueOf(a.getId()), a.getCode())).toList();
            case RESIDENT -> residents.findAllById(ids(targets)).stream()
                    .sorted(Comparator.comparing(Resident::getFullName))
                    .map(r -> new Target(String.valueOf(r.getId()), r.getFullName())).toList();
        };
    }

    /** "Toàn tòa" / "Tầng 3, Tầng 5" / "A0101, A0102" / tên cư dân. */
    public String label(Audience audience, Collection<String> targets) {
        return audience == Audience.ALL ? "Toàn tòa"
                : describe(audience, targets).stream().map(Target::label).collect(Collectors.joining(", "));
    }

    /** Các tầng có căn hộ của tòa (sắp theo số). */
    public List<String> floors(Long buildingId) {
        return apartments.findDistinctFloors(buildingId).stream()
                .sorted(Comparator.comparing((String f) -> f.matches("\\d+") ? Integer.parseInt(f) : Integer.MAX_VALUE)
                        .thenComparing(Comparator.naturalOrder()))
                .toList();
    }

    /** Căn hộ trong tòa thuộc đối tượng (để kiểm tra người trả lời khảo sát). */
    public boolean apartmentInAudience(Apartment apartment, Audience audience, Set<String> targets) {
        return switch (audience) {
            case ALL -> true;
            case FLOOR -> targets.contains(apartment.getFloorNo());
            case APARTMENT -> targets.contains(String.valueOf(apartment.getId()));
            case RESIDENT -> false;
        };
    }

    private static List<Long> ids(Collection<String> values) {
        List<Long> ids = new ArrayList<>();
        for (String v : values) {
            try {
                ids.add(Long.parseLong(v.trim()));
            } catch (NumberFormatException ignored) {
                // Bỏ qua giá trị không phải số: số lượng khác đi nên bị báo lỗi ở validateTargets.
            }
        }
        return ids;
    }
}
