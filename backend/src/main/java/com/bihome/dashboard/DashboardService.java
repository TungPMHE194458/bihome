package com.bihome.dashboard;

import com.bihome.building.BuildingService;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.util.AppTime;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Số liệu tổng hợp cho bảng điều khiển; dùng SQL thuần để mỗi chỉ số là một câu đếm có index. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final String OPEN = "('NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING')";
    private static final String HOLDING = "('PENDING', 'APPROVED', 'COMPLETED')";
    private static final String COLLECTIBLE = "('ISSUED', 'PARTIAL', 'OVERDUE')";
    private static final int WEEKS = 8;
    private static final int FEE_PERIODS = 6;
    private static final int RECENT = 6;

    private final NamedParameterJdbcTemplate jdbc;
    private final BuildingService buildingService;
    private final Clock clock;

    public DashboardDtos.Summary summary(YearMonth requested) {
        LocalDate today = LocalDate.now(clock.withZone(AppTime.ZONE));
        YearMonth month = requested != null ? requested : YearMonth.from(today);
        Optional<Set<Long>> scope = buildingService.listScope(null);
        if (scope.isPresent() && scope.get().isEmpty()) {
            return empty(month);
        }
        Query q = new Query(scope.orElse(null));
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime monthStart = start(month.atDay(1));
        OffsetDateTime monthEnd = start(month.plusMonths(1).atDay(1));
        q.params.addValue("now", now).addValue("monthStart", monthStart).addValue("monthEnd", monthEnd)
                .addValue("yearStart", start(LocalDate.of(month.getYear(), 1, 1)))
                .addValue("yearEnd", start(LocalDate.of(month.getYear() + 1, 1, 1)))
                .addValue("today", today);

        long buildingCount = q.count("SELECT COUNT(*) FROM BUILDING b WHERE b.STATUS = 'ACTIVE'" + q.scope("b.ID"));
        long apartments = q.count("SELECT COUNT(*) FROM APARTMENT a WHERE 1 = 1" + q.scope("a.BUILDING_ID"));
        long occupied = q.count("SELECT COUNT(DISTINCT ar.APARTMENT_ID) FROM APARTMENT_RESIDENT ar "
                + "JOIN APARTMENT a ON a.ID = ar.APARTMENT_ID WHERE ar.RESIDENCE_STATUS = 'LIVING'" + q.scope("a.BUILDING_ID"));
        long residents = q.count("SELECT COUNT(DISTINCT ar.RESIDENT_ID) FROM APARTMENT_RESIDENT ar "
                + "JOIN APARTMENT a ON a.ID = ar.APARTMENT_ID WHERE ar.RESIDENCE_STATUS <> 'MOVED_OUT'" + q.scope("a.BUILDING_ID"));
        long open = q.count("SELECT COUNT(*) FROM TICKET t WHERE t.STATUS IN " + OPEN + q.scope("t.BUILDING_ID"));
        long overdue = q.count("SELECT COUNT(*) FROM TICKET t WHERE t.STATUS IN " + OPEN
                + " AND (t.RESOLUTION_DUE_AT < :now OR (t.STATUS = 'NEW' AND t.RESPONSE_DUE_AT < :now))" + q.scope("t.BUILDING_ID"));
        long created = q.count("SELECT COUNT(*) FROM TICKET t WHERE t.CREATED_AT >= :monthStart AND t.CREATED_AT < :monthEnd"
                + q.scope("t.BUILDING_ID"));
        long resolved = q.count("SELECT COUNT(*) FROM TICKET t WHERE t.RESOLVED_AT >= :monthStart AND t.RESOLVED_AT < :monthEnd"
                + q.scope("t.BUILDING_ID"));
        long cards = q.count("SELECT COUNT(*) FROM ACCESS_CARD c WHERE c.STATUS = 'IN_USE'" + q.scope("c.BUILDING_ID"));
        long vouchers = q.count("SELECT COUNT(*) FROM VOUCHER v WHERE v.STATUS = 'ACTIVE' AND v.VALID_FROM <= :today "
                + "AND v.VALID_TO >= :today" + q.scope("v.BUILDING_ID"));
        q.params.addValue("monthFirst", month.atDay(1)).addValue("monthLast", month.atEndOfMonth());
        long bookingsToday = q.count("SELECT COUNT(*) FROM AMENITY_BOOKING b WHERE b.BOOKING_DATE = :today AND b.STATUS IN "
                + HOLDING + q.scope("b.BUILDING_ID"));
        long bookingsInMonth = q.count("SELECT COUNT(*) FROM AMENITY_BOOKING b WHERE b.BOOKING_DATE BETWEEN :monthFirst "
                + "AND :monthLast AND b.STATUS IN " + HOLDING + q.scope("b.BUILDING_ID"));

        q.params.addValue("period", month.toString()).addValue("periodFrom", month.minusMonths(FEE_PERIODS - 1L).toString());
        long feeDebt = q.count("SELECT NVL(SUM(n.TOTAL_AMOUNT - n.PAID_AMOUNT), 0) FROM FEE_NOTICE n WHERE n.STATUS IN "
                + COLLECTIBLE + " AND n.CARRIED_TO_ID IS NULL AND n.BILLING_PERIOD <= :period" + q.scope("n.BUILDING_ID"));
        List<DashboardDtos.FeePoint> fees = feeByPeriod(q, month);
        DashboardDtos.FeePoint latest = fees.reversed().stream().filter(f -> f.billed() > 0).findFirst().orElse(null);

        return new DashboardDtos.Summary(month, systemOverview(today), buildingCount, apartments, occupied, residents,
                open, overdue, created, resolved, bookingsToday, bookingsInMonth, feeDebt,
                latest == null ? null : (double) latest.collected() / latest.billed(), cards, vouchers,
                ticketsByMonth(q), ticketsByCategory(q), openByStatus(q), recentTickets(q, now),
                bookingsByWeek(q, month, today), latest == null ? null : latest.period(), fees);
    }

    private DashboardDtos.SystemOverview systemOverview(LocalDate today) {
        if (!CurrentUser.get().superAdmin()) {
            return null;
        }
        MapSqlParameterSource p = new MapSqlParameterSource("todayStart", start(today));
        Long users = jdbc.queryForObject("SELECT COUNT(*) FROM APP_USER WHERE STATUS = 'ACTIVE'", p, Long.class);
        Long logins = jdbc.queryForObject("SELECT COUNT(DISTINCT USER_ID) FROM LOGIN_HISTORY "
                + "WHERE SUCCESS = 1 AND CREATED_AT >= :todayStart", p, Long.class);
        return jdbc.queryForObject("SELECT NVL(SUM(FILE_SIZE), 0) BYTES, COUNT(*) FILES FROM FILE_ATTACHMENT", p,
                (rs, i) -> new DashboardDtos.SystemOverview(nz(users), nz(logins), rs.getLong("BYTES"), rs.getLong("FILES")));
    }

    private List<DashboardDtos.MonthPoint> ticketsByMonth(Query q) {
        long[] created = new long[13];
        long[] resolved = new long[13];
        String local = " AT TIME ZONE 'Asia/Ho_Chi_Minh'";
        q.each("SELECT EXTRACT(MONTH FROM (t.CREATED_AT" + local + ")) M, COUNT(*) C FROM TICKET t "
                + "WHERE t.CREATED_AT >= :yearStart AND t.CREATED_AT < :yearEnd" + q.scope("t.BUILDING_ID")
                + " GROUP BY EXTRACT(MONTH FROM (t.CREATED_AT" + local + "))", rs -> created[rs.getInt("M")] = rs.getLong("C"));
        q.each("SELECT EXTRACT(MONTH FROM (t.RESOLVED_AT" + local + ")) M, COUNT(*) C FROM TICKET t "
                + "WHERE t.RESOLVED_AT >= :yearStart AND t.RESOLVED_AT < :yearEnd" + q.scope("t.BUILDING_ID")
                + " GROUP BY EXTRACT(MONTH FROM (t.RESOLVED_AT" + local + "))", rs -> resolved[rs.getInt("M")] = rs.getLong("C"));
        List<DashboardDtos.MonthPoint> points = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            points.add(new DashboardDtos.MonthPoint(m, created[m], resolved[m]));
        }
        return points;
    }

    /** Yêu cầu tạo trong tháng theo danh mục (nhiều nhất trước). */
    private List<DashboardDtos.NamedCount> ticketsByCategory(Query q) {
        List<DashboardDtos.NamedCount> result = new ArrayList<>();
        q.each("SELECT c.ID, c.NAME, COUNT(*) C FROM TICKET t JOIN TICKET_CATEGORY c ON c.ID = t.CATEGORY_ID "
                + "WHERE t.CREATED_AT >= :monthStart AND t.CREATED_AT < :monthEnd" + q.scope("t.BUILDING_ID")
                + " GROUP BY c.ID, c.NAME ORDER BY C DESC, c.NAME",
                rs -> result.add(new DashboardDtos.NamedCount(rs.getString("ID"), rs.getString("NAME"), rs.getLong("C"))));
        return result;
    }

    private List<DashboardDtos.NamedCount> openByStatus(Query q) {
        List<DashboardDtos.NamedCount> result = new ArrayList<>();
        q.each("SELECT t.STATUS, COUNT(*) C FROM TICKET t WHERE t.STATUS IN " + OPEN + q.scope("t.BUILDING_ID")
                + " GROUP BY t.STATUS",
                rs -> result.add(new DashboardDtos.NamedCount(rs.getString("STATUS"), rs.getString("STATUS"), rs.getLong("C"))));
        return result;
    }

    private List<DashboardDtos.RecentTicket> recentTickets(Query q, OffsetDateTime now) {
        List<DashboardDtos.RecentTicket> result = new ArrayList<>();
        q.each("SELECT t.ID, t.CODE, t.TITLE, t.STATUS, t.PRIORITY, c.NAME CATEGORY_NAME, b.NAME BUILDING_NAME, "
                + "t.RESOLUTION_DUE_AT, t.RESPONSE_DUE_AT, t.CREATED_AT FROM TICKET t "
                + "JOIN TICKET_CATEGORY c ON c.ID = t.CATEGORY_ID JOIN BUILDING b ON b.ID = t.BUILDING_ID "
                + "WHERE t.STATUS IN " + OPEN + q.scope("t.BUILDING_ID")
                + " ORDER BY t.CREATED_AT DESC FETCH FIRST " + RECENT + " ROWS ONLY", rs -> {
                    String status = rs.getString("STATUS");
                    OffsetDateTime resolutionDue = rs.getObject("RESOLUTION_DUE_AT", OffsetDateTime.class);
                    OffsetDateTime responseDue = rs.getObject("RESPONSE_DUE_AT", OffsetDateTime.class);
                    boolean overdue = resolutionDue.isBefore(now) || ("NEW".equals(status) && responseDue.isBefore(now));
                    result.add(new DashboardDtos.RecentTicket(rs.getLong("ID"), rs.getString("CODE"), rs.getString("TITLE"),
                            status, rs.getString("PRIORITY"), rs.getString("CATEGORY_NAME"), rs.getString("BUILDING_NAME"),
                            overdue, rs.getObject("CREATED_AT", OffsetDateTime.class)));
                });
        return result;
    }

    /** {@value #WEEKS} tuần kết thúc ở tuần chứa hôm nay (tháng hiện tại) hoặc cuối tháng được chọn. */
    private List<DashboardDtos.WeekPoint> bookingsByWeek(Query q, YearMonth month, LocalDate today) {
        LocalDate anchor = month.atEndOfMonth().isBefore(today) ? month.atEndOfMonth() : today;
        LocalDate lastMonday = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate firstMonday = lastMonday.minusWeeks(WEEKS - 1L);
        q.params.addValue("weekFrom", firstMonday).addValue("weekTo", lastMonday.plusDays(6));
        Map<LocalDate, long[]> weeks = new TreeMap<>();
        for (int i = 0; i < WEEKS; i++) {
            weeks.put(firstMonday.plusWeeks(i), new long[2]);
        }
        q.each("SELECT b.BOOKING_DATE D, COUNT(*) C, SUM(b.PEOPLE_COUNT) P FROM AMENITY_BOOKING b "
                + "WHERE b.BOOKING_DATE BETWEEN :weekFrom AND :weekTo AND b.STATUS IN " + HOLDING + q.scope("b.BUILDING_ID")
                + " GROUP BY b.BOOKING_DATE", rs -> {
                    LocalDate d = rs.getObject("D", LocalDate.class);
                    long[] v = weeks.get(d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)));
                    if (v != null) {
                        v[0] += rs.getLong("C");
                        v[1] += rs.getLong("P");
                    }
                });
        return weeks.entrySet().stream()
                .map(e -> new DashboardDtos.WeekPoint(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    /** {@value #FEE_PERIODS} kỳ kết thúc ở tháng chọn; phát sinh không tính dòng "Nợ kỳ trước". */
    private List<DashboardDtos.FeePoint> feeByPeriod(Query q, YearMonth month) {
        Map<String, long[]> periods = new TreeMap<>();
        for (int i = FEE_PERIODS - 1; i >= 0; i--) {
            periods.put(month.minusMonths(i).toString(), new long[2]);
        }
        q.each("SELECT n.BILLING_PERIOD P, SUM(n.TOTAL_AMOUNT - NVL(d.DEBT, 0)) B, "
                + "SUM(GREATEST(n.PAID_AMOUNT - NVL(d.DEBT, 0), 0)) C FROM FEE_NOTICE n LEFT JOIN (SELECT FEE_NOTICE_ID, "
                + "SUM(AMOUNT) DEBT FROM FEE_NOTICE_ITEM WHERE ITEM_TYPE = 'PREVIOUS_DEBT' GROUP BY FEE_NOTICE_ID) d "
                + "ON d.FEE_NOTICE_ID = n.ID WHERE n.STATUS NOT IN ('DRAFT', 'CANCELLED') AND n.BILLING_PERIOD BETWEEN "
                + ":periodFrom AND :period" + q.scope("n.BUILDING_ID") + " GROUP BY n.BILLING_PERIOD", rs -> {
                    long[] v = periods.get(rs.getString("P"));
                    if (v != null) {
                        v[0] = rs.getLong("B");
                        v[1] = rs.getLong("C");
                    }
                });
        return periods.entrySet().stream()
                .map(e -> new DashboardDtos.FeePoint(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    private DashboardDtos.Summary empty(YearMonth month) {
        List<DashboardDtos.MonthPoint> months = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            months.add(new DashboardDtos.MonthPoint(m, 0, 0));
        }
        return new DashboardDtos.Summary(month, null, 0, 0, 0, 0, 0, 0, 0, 0, 0L, 0L, 0L, null, 0, 0,
                months, List.of(), List.of(), List.of(), List.of(), null, List.of());
    }

    private static OffsetDateTime start(LocalDate day) {
        return day.atStartOfDay(AppTime.ZONE).toOffsetDateTime();
    }

    private static long nz(Long value) {
        return value == null ? 0 : value;
    }

    @FunctionalInterface
    private interface RowHandler {
        void handle(ResultSet rs) throws SQLException;
    }

    /** Tham số dùng chung + điều kiện phạm vi tòa ({@code null} = không giới hạn). */
    private final class Query {
        final MapSqlParameterSource params = new MapSqlParameterSource();
        final boolean scoped;

        Query(Set<Long> buildingIds) {
            scoped = buildingIds != null;
            if (scoped) {
                params.addValue("buildingIds", buildingIds);
            }
        }

        String scope(String column) {
            return scoped ? " AND " + column + " IN (:buildingIds)" : "";
        }

        long count(String sql) {
            return nz(jdbc.queryForObject(sql, params, Long.class));
        }

        void each(String sql, RowHandler handler) {
            jdbc.query(sql, params, rs -> {
                handler.handle(rs);
            });
        }
    }
}
