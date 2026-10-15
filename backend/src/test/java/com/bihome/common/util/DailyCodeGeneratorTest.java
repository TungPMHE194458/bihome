package com.bihome.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class DailyCodeGeneratorTest {

    // 2026-10-15 10:00 +07:00.
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-15T03:00:00Z"), ZoneId.of("UTC"));

    @Mock JdbcTemplate jdbc;

    DailyCodeGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new DailyCodeGenerator(jdbc, CLOCK);
    }

    @Test
    void sameDayCounterIncrementsAndPadsToThreeDigits() {
        when(jdbc.update(eq("UPDATE CODE_COUNTER SET LAST_NO = LAST_NO + 1 WHERE PREFIX = ? AND CODE_DATE = ?"),
                eq("DK"), eq("261015"))).thenReturn(1);
        when(jdbc.queryForObject(eq("SELECT LAST_NO FROM CODE_COUNTER WHERE PREFIX = ? AND CODE_DATE = ?"),
                eq(Long.class), eq("DK"), eq("261015"))).thenReturn(7L);

        assertThat(generator.next("DK")).isEqualTo("DK-261015-007");
    }

    @Test
    void firstUseOfThePrefixAndDayInsertsTheCounterRowFirst() {
        when(jdbc.update(eq("UPDATE CODE_COUNTER SET LAST_NO = LAST_NO + 1 WHERE PREFIX = ? AND CODE_DATE = ?"),
                eq("YC"), eq("261015"))).thenReturn(0, 1);
        when(jdbc.queryForObject(eq("SELECT LAST_NO FROM CODE_COUNTER WHERE PREFIX = ? AND CODE_DATE = ?"),
                eq(Long.class), eq("YC"), eq("261015"))).thenReturn(1L);

        assertThat(generator.next("YC")).isEqualTo("YC-261015-001");

        verify(jdbc).update(eq("INSERT /*+ IGNORE_ROW_ON_DUPKEY_INDEX(CODE_COUNTER, PK_CODE_COUNTER) */ "
                + "INTO CODE_COUNTER (PREFIX, CODE_DATE, LAST_NO) VALUES (?, ?, 0)"), eq("YC"), eq("261015"));
    }

    @Test
    void counterPast999IsNotZeroPadded() {
        when(jdbc.update(eq("UPDATE CODE_COUNTER SET LAST_NO = LAST_NO + 1 WHERE PREFIX = ? AND CODE_DATE = ?"),
                eq("GD"), eq("261015"))).thenReturn(1);
        when(jdbc.queryForObject(eq("SELECT LAST_NO FROM CODE_COUNTER WHERE PREFIX = ? AND CODE_DATE = ?"),
                eq(Long.class), eq("GD"), eq("261015"))).thenReturn(1000L);

        assertThat(generator.next("GD")).isEqualTo("GD-261015-1000");
    }
}
