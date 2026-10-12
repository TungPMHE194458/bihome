package com.bihome.common.storage;

import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Quyền xem tệp qua {@code GET /files/{id}}: người tải lên luôn xem được (xem trước trong form khi chưa lưu); ảnh đại
 * diện người dùng là dữ liệu dùng chung; còn lại tệp phải thuộc bản ghi của một tòa người dùng được truy cập. Tệp chưa
 * gắn vào đâu (của người khác) coi như không tồn tại.
 */
@Component
@RequiredArgsConstructor
public class FileAccessPolicy {

    /** Tòa sở hữu tệp, tra theo mọi bảng tham chiếu FILE_ATTACHMENT (BUILDING_ID null = dùng chung). */
    static final String OWNER_BUILDINGS = """
            SELECT b.BUILDING_ID FROM BUILDING_IMAGE b WHERE b.FILE_ID = ?
            UNION ALL SELECT a.BUILDING_ID FROM APARTMENT_IMAGE i JOIN APARTMENT a ON a.ID = i.APARTMENT_ID WHERE i.FILE_ID = ?
            UNION ALL SELECT a.BUILDING_ID FROM AMENITY_IMAGE i JOIN AMENITY a ON a.ID = i.AMENITY_ID WHERE i.FILE_ID = ?
            UNION ALL SELECT s.BUILDING_ID FROM SERVICE_IMAGE i JOIN SERVICE s ON s.ID = i.SERVICE_ID WHERE i.FILE_ID = ?
            UNION ALL SELECT d.BUILDING_ID FROM DOCUMENT d WHERE d.FILE_ID = ?
            UNION ALL SELECT d.BUILDING_ID FROM DOCUMENT_FILE_VERSION v JOIN DOCUMENT d ON d.ID = v.DOCUMENT_ID WHERE v.FILE_ID = ?
            UNION ALL SELECT m.BUILDING_ID FROM METER_READING m WHERE m.IMAGE_FILE_ID = ?
            UNION ALL SELECT r.BUILDING_ID FROM RESIDENT r WHERE r.AVATAR_FILE_ID = ?
            UNION ALL SELECT t.BUILDING_ID FROM TICKET_ATTACHMENT x JOIN TICKET t ON t.ID = x.TICKET_ID WHERE x.FILE_ID = ?
            UNION ALL SELECT n.BUILDING_ID FROM ANNOUNCEMENT_ATTACHMENT x JOIN ANNOUNCEMENT n ON n.ID = x.ANNOUNCEMENT_ID WHERE x.FILE_ID = ?
            UNION ALL SELECT CAST(NULL AS NUMBER(19)) FROM USER_PROFILE p WHERE p.AVATAR_FILE_ID = ?
            """;
    private static final int PARAMS = 11;

    private final JdbcTemplate jdbc;
    private final FileReferences references;

    public void requireReadable(FileAttachment file, AuthUser user) {
        if (user.superAdmin()) {
            return;
        }
        // Người tải lên xem được tệp chưa gắn vào đâu (xem trước trong form); đã gắn thì theo quyền tòa của bản ghi.
        if (user.username().equals(file.getCreatedBy()) && !references.isReferenced(file.getId())) {
            return;
        }
        Object[] args = new Object[PARAMS];
        Arrays.fill(args, file.getId());
        List<Long> buildings = jdbc.query(OWNER_BUILDINGS, (rs, i) -> {
            long v = rs.getLong(1);
            return rs.wasNull() ? null : v;
        }, args);
        boolean allowed = buildings.stream().anyMatch(b -> b == null || user.buildingIds().contains(b));
        if (!allowed) {
            throw new NotFoundException("Không tìm thấy tệp.");
        }
    }
}
