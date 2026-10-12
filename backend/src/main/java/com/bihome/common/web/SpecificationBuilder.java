package com.bihome.common.web;

import com.bihome.common.util.AppTime;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.From;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** Ghép các điều kiện lọc động; giá trị null/rỗng bị bỏ qua để filter của FE có thể bỏ trống. */
public final class SpecificationBuilder<T> {

    private final List<Specification<T>> specs = new ArrayList<>();

    private SpecificationBuilder() {
    }

    public static <T> SpecificationBuilder<T> create() {
        return new SpecificationBuilder<>();
    }

    public SpecificationBuilder<T> and(Specification<T> spec) {
        if (spec != null) {
            specs.add(spec);
        }
        return this;
    }

    public SpecificationBuilder<T> like(String field, String keyword) {
        if (isBlank(keyword)) {
            return this;
        }
        String pattern = likePattern(keyword);
        return and((root, query, cb) -> cb.like(cb.lower(path(root, field).as(String.class)), pattern, '\\'));
    }

    public SpecificationBuilder<T> likeAny(String keyword, String... fields) {
        if (isBlank(keyword) || fields.length == 0) {
            return this;
        }
        String pattern = likePattern(keyword);
        return and((root, query, cb) -> {
            Predicate[] predicates = new Predicate[fields.length];
            for (int i = 0; i < fields.length; i++) {
                predicates[i] = cb.like(cb.lower(path(root, fields[i]).as(String.class)), pattern, '\\');
            }
            return cb.or(predicates);
        });
    }

    public SpecificationBuilder<T> eq(String field, Object value) {
        if (value == null || (value instanceof String s && s.isBlank())) {
            return this;
        }
        return and((root, query, cb) -> cb.equal(path(root, field), value));
    }

    public SpecificationBuilder<T> in(String field, Collection<?> values) {
        if (values == null || values.isEmpty()) {
            return this;
        }
        return and((root, query, cb) -> path(root, field).in(values));
    }

    /** Lọc cột thời gian theo khoảng ngày (gồm cả ngày {@code to}) tính theo múi giờ Asia/Ho_Chi_Minh. */
    public SpecificationBuilder<T> dateBetween(String field, LocalDate from, LocalDate to) {
        if (from != null) {
            OffsetDateTime start = from.atStartOfDay(AppTime.ZONE).toOffsetDateTime();
            and((root, query, cb) -> cb.greaterThanOrEqualTo(timestamp(root, field), start));
        }
        if (to != null) {
            OffsetDateTime endExclusive = to.plusDays(1).atStartOfDay(AppTime.ZONE).toOffsetDateTime();
            and((root, query, cb) -> cb.lessThan(timestamp(root, field), endExclusive));
        }
        return this;
    }

    /** Lọc cột ngày thuần (LocalDate) theo khoảng, gồm cả hai đầu. */
    public SpecificationBuilder<T> localDateBetween(String field, LocalDate from, LocalDate to) {
        if (from != null) {
            and((root, query, cb) -> cb.greaterThanOrEqualTo(path(root, field).as(LocalDate.class), from));
        }
        if (to != null) {
            and((root, query, cb) -> cb.lessThanOrEqualTo(path(root, field).as(LocalDate.class), to));
        }
        return this;
    }

    public Specification<T> build() {
        return Specification.allOf(specs);
    }

    /** Mẫu LIKE không phân biệt hoa thường, đã escape ký tự đặc biệt (dùng cho subquery tự viết). */
    public static String likePattern(String keyword) {
        return "%" + escapeLike(keyword.trim().toLowerCase(Locale.ROOT)) + "%";
    }

    static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static Expression<OffsetDateTime> timestamp(Root<?> root, String field) {
        return path(root, field).as(OffsetDateTime.class);
    }

    /**
     * Đường dẫn trường; "a.b" đi qua quan hệ bằng LEFT JOIN (dùng lại join đã có) để quan hệ không bắt buộc bị trống
     * (vd giao dịch không có cư dân) không làm mất dòng khi tìm theo từ khoá.
     */
    private static Path<?> path(Root<?> root, String field) {
        String[] parts = field.split("\\.");
        From<?, ?> from = root;
        for (int i = 0; i < parts.length - 1; i++) {
            from = leftJoin(from, parts[i]);
        }
        return from.get(parts[parts.length - 1]);
    }

    private static From<?, ?> leftJoin(From<?, ?> from, String attribute) {
        for (Join<?, ?> join : from.getJoins()) {
            if (join.getAttribute().getName().equals(attribute) && join.getJoinType() == JoinType.LEFT) {
                return join;
            }
        }
        return from.join(attribute, JoinType.LEFT);
    }
}
