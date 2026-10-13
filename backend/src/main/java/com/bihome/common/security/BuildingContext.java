package com.bihome.common.security;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * Tòa nhà đang chọn (header {@code X-Building-Id}), đã được {@link BuildingContextFilter} kiểm tra quyền.
 * Service building-scoped luôn lấy buildingId từ đây, không tin buildingId trong body.
 */
@Component
public class BuildingContext {

    public static final String HEADER = "X-Building-Id";
    static final String ATTRIBUTE = BuildingContext.class.getName() + ".buildingId";

    public Optional<Long> selectedBuildingId() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return Optional.empty();
        }
        return Optional.ofNullable((Long) attrs.getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST));
    }

    /**
     * Chỉ dùng cho app cư dân (không gửi X-Building-Id): chọn tòa của căn hộ cư dân đang thao tác, sau khi
     * {@code residentapp.ResidentContext} đã kiểm tra căn hộ thuộc cư dân.
     */
    public void select(Long buildingId) {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            attrs.setAttribute(ATTRIBUTE, buildingId, RequestAttributes.SCOPE_REQUEST);
        }
    }

    public Long requireBuildingId() {
        return selectedBuildingId().orElseThrow(() -> new BusinessException(ErrorCode.BUILDING_REQUIRED));
    }

    /** Rỗng = không giới hạn (Admin hệ thống, chế độ "Tất cả"); ngược lại là các tòa user được gán. */
    public Optional<Set<Long>> accessibleBuildingIds() {
        AuthUser user = CurrentUser.get();
        return user.superAdmin() ? Optional.empty() : Optional.of(user.buildingIds());
    }
}
