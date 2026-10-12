package com.bihome.common.storage;

import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Các bảng tham chiếu FILE_ATTACHMENT, đọc từ khoá ngoại trong từ điển dữ liệu (module mới tự được tính). Dùng để biết
 * tệp đã gắn vào bản ghi nào chưa: tệp đã gắn thì không gắn lại sang bản ghi khác, tệp mồ côi lâu thì dọn.
 */
@Component
@RequiredArgsConstructor
public class FileReferences {

    private final JdbcTemplate jdbc;
    private volatile List<String[]> columns;

    /** [bảng, cột] tham chiếu tới FILE_ATTACHMENT.ID. */
    List<String[]> columns() {
        List<String[]> cached = columns;
        if (cached == null) {
            cached = jdbc.query("""
                    SELECT c.TABLE_NAME, cc.COLUMN_NAME FROM USER_CONSTRAINTS c
                    JOIN USER_CONS_COLUMNS cc ON cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
                    WHERE c.CONSTRAINT_TYPE = 'R' AND c.R_CONSTRAINT_NAME = (SELECT CONSTRAINT_NAME FROM USER_CONSTRAINTS
                        WHERE TABLE_NAME = 'FILE_ATTACHMENT' AND CONSTRAINT_TYPE = 'P')
                    ORDER BY c.TABLE_NAME""", (rs, i) -> new String[] {rs.getString(1), rs.getString(2)});
            columns = cached;
        }
        return cached;
    }

    /** Điều kiện "không bảng nào tham chiếu f.ID" để ghép vào câu SQL trên FILE_ATTACHMENT f. */
    String unreferencedCondition() {
        return columns().stream()
                .map(c -> "NOT EXISTS (SELECT 1 FROM " + c[0] + " x WHERE x." + c[1] + " = f.ID)")
                .collect(Collectors.joining(" AND "));
    }

    public boolean isReferenced(Long fileId) {
        String condition = unreferencedCondition();
        if (condition.isEmpty()) {
            return false;
        }
        Integer free = jdbc.queryForObject("SELECT COUNT(*) FROM FILE_ATTACHMENT f WHERE f.ID = ? AND " + condition,
                Integer.class, fileId);
        return free == null || free == 0;
    }
}
