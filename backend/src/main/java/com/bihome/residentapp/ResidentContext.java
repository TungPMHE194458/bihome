package com.bihome.residentapp;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.BuildingContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/** Cư dân của request hiện tại (do {@link ResidentAuthFilter} đặt) và kiểm tra căn hộ thuộc cư dân. */
@Component
@RequiredArgsConstructor
public class ResidentContext {

    static final String ATTRIBUTE = ResidentContext.class.getName() + ".session";

    private final BuildingContext buildingContext;

    public ResidentSession current() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        Object session = attrs == null ? null : attrs.getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (session instanceof ResidentSession s) {
            return s;
        }
        throw new BusinessException(ErrorCode.UNAUTHORIZED);
    }

    /**
     * Căn hộ phải là căn cư dân đang ở (không thì 404, như bản ghi tòa khác ở web BQL); chọn tòa của căn làm ngữ cảnh
     * tòa nhà cho các service dùng chung.
     */
    public ResidentSession.ApartmentRef requireApartment(Long apartmentId) {
        return requireOwned(apartmentId, "Không tìm thấy căn hộ.");
    }

    /** Bản ghi phải thuộc một căn của cư dân; dùng cho chi tiết thông báo phí, yêu cầu, lượt đặt... */
    public ResidentSession.ApartmentRef requireOwned(Long apartmentId, String notFoundMessage) {
        ResidentSession s = current();
        ResidentSession.ApartmentRef apartment = apartmentId == null ? null : s.apartment(apartmentId).orElse(null);
        if (apartment == null) {
            throw new NotFoundException(notFoundMessage);
        }
        buildingContext.select(apartment.buildingId());
        return apartment;
    }
}
