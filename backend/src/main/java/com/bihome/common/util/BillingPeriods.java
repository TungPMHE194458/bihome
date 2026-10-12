package com.bihome.common.util;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/** Kỳ thu phí dạng {@code yyyy-MM} (lưu chuỗi để so sánh / sắp xếp trực tiếp trong SQL). */
public final class BillingPeriods {

    public static final String PATTERN = "^\\d{4}-(0[1-9]|1[0-2])$";
    private static final DateTimeFormatter LABEL = DateTimeFormatter.ofPattern("MM/yyyy");

    private BillingPeriods() {
    }

    public static YearMonth parse(String period, String field) {
        if (period == null || !period.matches(PATTERN)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, field, "Kỳ không hợp lệ (định dạng yyyy-MM).");
        }
        try {
            return YearMonth.parse(period);
        } catch (DateTimeParseException e) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, field, "Kỳ không hợp lệ (định dạng yyyy-MM).");
        }
    }

    public static String of(YearMonth month) {
        return month.toString();
    }

    /** "2026-09" → "09/2026". */
    public static String label(String period) {
        return YearMonth.parse(period).format(LABEL);
    }

    /** Ngày {@code day} của tháng sau kỳ; tháng ít ngày hơn thì lấy ngày cuối tháng. */
    public static LocalDate dueDate(String period, int day) {
        YearMonth next = YearMonth.parse(period).plusMonths(1);
        return next.atDay(Math.min(day, next.lengthOfMonth()));
    }

    public static boolean isFuture(String period, LocalDate today) {
        return YearMonth.parse(period).isAfter(YearMonth.from(today));
    }
}
