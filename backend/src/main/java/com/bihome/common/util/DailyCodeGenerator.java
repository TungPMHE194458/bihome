package com.bihome.common.util;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sinh mã {PREFIX}-yyMMdd-xxx theo ngày từ bảng CODE_COUNTER: UPDATE khoá dòng tới khi commit nên hai giao dịch
 * cùng lúc không lấy trùng số; ngày mới thì INSERT bỏ qua dòng trùng (hint IGNORE_ROW_ON_DUPKEY_INDEX).
 */
@Component
@RequiredArgsConstructor
public class DailyCodeGenerator {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyMMdd");

    private final JdbcTemplate jdbc;
    private final Clock clock;

    @Transactional(propagation = Propagation.MANDATORY)
    public String next(String prefix) {
        String day = LocalDate.now(clock.withZone(AppTime.ZONE)).format(DAY);
        String update = "UPDATE CODE_COUNTER SET LAST_NO = LAST_NO + 1 WHERE PREFIX = ? AND CODE_DATE = ?";
        if (jdbc.update(update, prefix, day) == 0) {
            jdbc.update("INSERT /*+ IGNORE_ROW_ON_DUPKEY_INDEX(CODE_COUNTER, PK_CODE_COUNTER) */ "
                    + "INTO CODE_COUNTER (PREFIX, CODE_DATE, LAST_NO) VALUES (?, ?, 0)", prefix, day);
            jdbc.update(update, prefix, day);
        }
        Long no = jdbc.queryForObject("SELECT LAST_NO FROM CODE_COUNTER WHERE PREFIX = ? AND CODE_DATE = ?",
                Long.class, prefix, day);
        long n = no == null ? 1 : no;
        return prefix + "-" + day + "-" + (n < 1000 ? "%03d".formatted(n) : Long.toString(n));
    }
}
