package com.bihome.common.web;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Tham số phân trang chuẩn: {@code page} từ 0, {@code size} 10/20/50, {@code sort=field,asc|desc}. */
public record PageParams(Integer page, Integer size, String sort) {

    public static final int DEFAULT_SIZE = 10;
    public static final Set<Integer> ALLOWED_SIZES = Set.of(10, 20, 50);

    public Pageable toPageable(Sort defaultSort, Set<String> sortableFields) {
        Map<String, String> identity = new HashMap<>();
        sortableFields.forEach(f -> identity.put(f, f));
        return toPageable(defaultSort, identity);
    }

    /** {@code sortMapping}: tên trường API → đường dẫn thuộc tính entity (vd {@code fullName} → {@code profile.fullName}). */
    public Pageable toPageable(Sort defaultSort, Map<String, String> sortMapping) {
        int pageNo = page == null ? 0 : page;
        if (pageNo < 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "Số trang không được âm.");
        }
        int pageSize = size == null ? DEFAULT_SIZE : size;
        if (!ALLOWED_SIZES.contains(pageSize)) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "Số dòng mỗi trang chỉ được là 10, 20 hoặc 50.");
        }
        return PageRequest.of(pageNo, pageSize, parseSort(defaultSort, sortMapping));
    }

    private Sort parseSort(Sort defaultSort, Map<String, String> sortMapping) {
        if (sort == null || sort.isBlank()) {
            return defaultSort;
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        String property = sortMapping.get(field);
        if (property == null) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "Không thể sắp xếp theo trường '" + field + "'.");
        }
        String direction = parts.length > 1 ? parts[1].trim().toLowerCase() : "asc";
        if (!direction.equals("asc") && !direction.equals("desc")) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "Chiều sắp xếp chỉ được là asc hoặc desc.");
        }
        return Sort.by(direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC, property);
    }
}
