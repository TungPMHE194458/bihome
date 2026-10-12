package com.bihome.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import com.bihome.common.messaging.RichText;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class ReminderScheduleTest {

    private static final LocalTime NINE = LocalTime.of(9, 0);

    @Test
    void nextMonthlyRunUsesTheLastDayOfShortMonthsAndStopsAfterTheEndDate() {
        OffsetDateTime jan31Noon = OffsetDateTime.parse("2027-01-31T12:00:00+07:00");
        // 31/01 09:00 đã qua → tháng 2 (28 ngày) gửi ngày 28.
        assertThat(ReminderSchedule.nextMonthly(31, NINE, null, jan31Noon))
                .contains(OffsetDateTime.parse("2027-02-28T09:00:00+07:00"));
        // Ngày 5 lúc 09:00 chưa tới → ngay tháng này.
        assertThat(ReminderSchedule.nextMonthly(5, NINE, null, OffsetDateTime.parse("2026-10-05T08:59:00+07:00")))
                .contains(OffsetDateTime.parse("2026-10-05T09:00:00+07:00"));
        assertThat(ReminderSchedule.nextMonthly(5, NINE, LocalDate.of(2026, 10, 31), OffsetDateTime.parse("2026-10-05T09:00:00+07:00")))
                .isEmpty();
    }

    @Test
    void richTextKeepsFormattingButDropsScriptsAndEventHandlers() {
        String html = "<h3>Lịch</h3><p onclick=\"x()\">Xin <b>chào</b> <u>bạn</u><script>alert(1)</script></p>"
                + "<ul><li>Một</li></ul><a href=\"https://bihome.vn\" target=\"_blank\">BQL</a><a href=\"javascript:alert(1)\">x</a>"
                + "<img src=x onerror=alert(1)>";
        String clean = RichText.sanitize(html);
        assertThat(clean).contains("<h3>Lịch</h3>", "<b>chào</b>", "<u>bạn</u>", "<ul><li>Một</li></ul>",
                "href=\"https://bihome.vn\"", "rel=\"noopener noreferrer\"");
        assertThat(clean).doesNotContain("script", "onclick", "javascript", "<img", "onerror");
        assertThat(RichText.text("<p>  </p><br>")).isEmpty();
    }
}
