package com.bihome.residentapp;

import com.bihome.common.security.AuthUser;
import com.bihome.resident.ResidentEnums.ResidentRole;
import java.util.List;
import java.util.Optional;

/**
 * Cư dân đang đăng nhập app (nạp lại từ DB mỗi request). {@link #actor()} là người thao tác dùng khi gọi lại service
 * của BQL: không có quyền BQL nào, chỉ thấy tòa của cư dân, tên = "Họ tên (cư dân SĐT)" (ghi vào CREATED_BY / lịch sử).
 */
public record ResidentSession(
        Long accountId,
        Long residentId,
        String residentCode,
        String fullName,
        String phone,
        Long buildingId,
        boolean mustChangePassword,
        List<ApartmentRef> apartments,
        AuthUser actor) {

    public static final String ROLE = "APP_RESIDENT";

    /** Căn hộ cư dân đang ở (chưa chuyển đi). */
    public record ApartmentRef(Long id, String code, String name, String floorNo, Long buildingId, String buildingName,
                               ResidentRole role, boolean householdHead) {
    }

    public Optional<ApartmentRef> apartment(Long apartmentId) {
        return apartments.stream().filter(a -> a.id().equals(apartmentId)).findFirst();
    }

    public List<Long> apartmentIds() {
        return apartments.stream().map(ApartmentRef::id).toList();
    }
}
