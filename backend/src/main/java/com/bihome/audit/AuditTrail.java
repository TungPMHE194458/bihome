package com.bihome.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Đánh dấu entity được ghi lịch sử hoạt động (AUDIT_LOG) khi tạo / sửa / xoá, qua {@link AuditEventListener}.
 * Entity không có annotation này (token, OTP, bộ đếm, dòng thời gian...) không được ghi.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditTrail {

    /** Mã module theo permission (vd APARTMENT) — dùng để lọc và phân quyền xem. */
    String module();

    /** Loại đối tượng (vd TICKET_CATEGORY); FE có nhãn tiếng Việt tương ứng. */
    String type();

    /** Các trường ghép thành nhãn đối tượng (vd {"code", "name"}); rỗng = "#id". */
    String[] label() default {};

    /** Trường thay đổi không cần ghi (vd thời điểm đăng nhập gần nhất). */
    String[] ignore() default {};

    /** Trường nhạy cảm: ghi là có thay đổi nhưng che giá trị. */
    String[] mask() default {};

    /** Bản thân entity là tòa nhà (BUILDING_ID của log = id). */
    boolean building() default false;

    /**
     * Entity không có trường {@code buildingId}: câu SQL một tham số trả về BUILDING_ID, tham số là giá trị của
     * {@link #buildingKey()} (rỗng = id của entity).
     */
    String buildingSql() default "";

    String buildingKey() default "";
}
