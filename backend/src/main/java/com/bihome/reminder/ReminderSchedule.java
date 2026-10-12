package com.bihome.reminder;

import com.bihome.common.util.AppTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.Optional;

/** Tính lần gửi kế tiếp của nhắc nhở lặp hằng tháng (giờ Việt Nam). */
public final class ReminderSchedule {

    private ReminderSchedule() {
    }

    /**
     * Lần gửi đầu tiên sau {@code after} vào ngày {@code day} (tháng ít ngày hơn thì ngày cuối tháng) lúc {@code time};
     * rỗng nếu vượt {@code endDate}.
     */
    public static Optional<OffsetDateTime> nextMonthly(int day, LocalTime time, LocalDate endDate, OffsetDateTime after) {
        YearMonth month = YearMonth.from(after.atZoneSameInstant(AppTime.ZONE));
        for (int i = 0; i < 3; i++) {
            YearMonth m = month.plusMonths(i);
            LocalDate date = m.atDay(Math.min(day, m.lengthOfMonth()));
            OffsetDateTime candidate = date.atTime(time).atZone(AppTime.ZONE).toOffsetDateTime();
            if (candidate.isAfter(after)) {
                return endDate != null && date.isAfter(endDate) ? Optional.empty() : Optional.of(candidate);
            }
        }
        return Optional.empty();
    }
}
