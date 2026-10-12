package com.bihome.common.storage;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hằng đêm 03:00: xoá tệp tải lên rồi bỏ (huỷ form) — quá 24 giờ mà không bảng nào tham chiếu. Danh sách bảng tham
 * chiếu lấy từ khoá ngoại tới FILE_ATTACHMENT trong từ điển dữ liệu nên module mới tự được tính.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrphanFileCleanupJob {

    static final Duration GRACE = Duration.ofHours(24);
    static final int BATCH = 500;

    private final JdbcTemplate jdbc;
    private final FileService fileService;
    private final FileReferences references;
    private final Clock clock;

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int removed = cleanup();
        if (removed > 0) {
            log.info("Đã xoá {} tệp không còn được dùng", removed);
        }
    }

    @Transactional
    public int cleanup() {
        String condition = references.unreferencedCondition();
        String where = condition.isEmpty() ? "" : " AND " + condition;
        List<Long> ids = jdbc.queryForList("SELECT f.ID FROM FILE_ATTACHMENT f WHERE f.CREATED_AT < ?" + where
                + " FETCH FIRST " + BATCH + " ROWS ONLY", Long.class, OffsetDateTime.now(clock).minus(GRACE));
        if (!ids.isEmpty()) {
            fileService.deleteAll(ids);
        }
        return ids.size();
    }
}
