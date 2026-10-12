package com.bihome.amenityreport;

import com.bihome.amenity.Amenity;
import com.bihome.amenity.AmenityConfig;
import com.bihome.amenity.AmenityConfigRepository;
import com.bihome.amenity.AmenityRepository;
import com.bihome.amenity.AmenityService;
import com.bihome.booking.AmenityBooking;
import com.bihome.booking.AmenityBooking.Status;
import com.bihome.booking.AmenityBookingRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.util.AppTime;
import com.bihome.transaction.FinancialTransaction;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.transaction.FinancialTransactionRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Sheet;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Báo cáo tiện ích theo khoảng ngày sử dụng: lượt đặt, tỉ lệ lấp đầy (người giữ chỗ / sức chứa các khung giờ mở cửa,
 * trừ ngày bảo trì), doanh thu (theo giao dịch của lượt đặt) và tỉ lệ huỷ.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AmenityReportService {

    static final int MAX_DAYS = 366;
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final Map<Status, String> STATUS_LABELS = new EnumMap<>(Map.of(
            Status.PENDING, "Chờ duyệt", Status.APPROVED, "Đã duyệt", Status.REJECTED, "Từ chối",
            Status.CANCELLED, "Đã huỷ", Status.COMPLETED, "Hoàn thành"));

    private final AmenityBookingRepository bookings;
    private final AmenityRepository amenities;
    private final AmenityConfigRepository configs;
    private final AmenityService amenityService;
    private final FinancialTransactionRepository transactions;
    private final BuildingService buildingService;
    private final Clock clock;

    private record Data(LocalDate from, LocalDate to, List<Amenity> amenities, Map<Long, AmenityConfig> configs,
                        List<AmenityBooking> bookings, Map<Long, FinancialTransaction> tx) {
    }

    public AmenityReportDtos.Report report(LocalDate from, LocalDate to, Long amenityId) {
        Data d = load(from, to, amenityId);
        List<AmenityBooking> holding = d.bookings().stream().filter(b -> Status.HOLDING.contains(b.getStatus())).toList();
        long cancelled = d.bookings().stream()
                .filter(b -> b.getStatus() == Status.CANCELLED || b.getStatus() == Status.REJECTED).count();
        long people = holding.stream().mapToLong(AmenityBooking::getPeopleCount).sum();

        List<AmenityReportDtos.AmenityRow> rows = new ArrayList<>();
        long totalCapacity = 0;
        for (Amenity a : d.amenities()) {
            List<AmenityBooking> mine = d.bookings().stream().filter(b -> b.getAmenityId().equals(a.getId())).toList();
            long cap = capacity(a, d.configs().get(a.getId()), d.from(), d.to());
            long used = mine.stream().filter(b -> Status.HOLDING.contains(b.getStatus())).mapToLong(AmenityBooking::getPeopleCount).sum();
            long cancel = mine.stream().filter(b -> b.getStatus() == Status.CANCELLED || b.getStatus() == Status.REJECTED).count();
            totalCapacity += cap;
            rows.add(new AmenityReportDtos.AmenityRow(a.getId(), a.getCode(), a.getName(), mine.size(), cancel, used, cap,
                    rate(used, cap), revenue(mine, d.tx(), false)));
        }
        rows.sort(Comparator.comparingLong(AmenityReportDtos.AmenityRow::bookings).reversed()
                .thenComparing(AmenityReportDtos.AmenityRow::name));

        Map<LocalDate, long[]> days = new TreeMap<>();
        for (LocalDate day = d.from(); !day.isAfter(d.to()); day = day.plusDays(1)) {
            days.put(day, new long[2]);
        }
        holding.forEach(b -> {
            long[] v = days.get(b.getBookingDate());
            v[0]++;
            v[1] += b.getPeopleCount();
        });
        Map<String, long[]> slots = new TreeMap<>();
        holding.forEach(b -> {
            long[] v = slots.computeIfAbsent(b.getStartTime().toString(), k -> new long[2]);
            v[0]++;
            v[1] += b.getPeopleCount();
        });
        Map<Status, Long> statuses = new EnumMap<>(Status.class);
        d.bookings().forEach(b -> statuses.merge(b.getStatus(), 1L, Long::sum));

        return new AmenityReportDtos.Report(d.from(), d.to(), d.bookings().size(), holding.size(), cancelled, people,
                rate(people, totalCapacity), rate(cancelled, d.bookings().size()), revenue(d.bookings(), d.tx(), false),
                revenue(d.bookings(), d.tx(), true),
                days.entrySet().stream().map(e -> new AmenityReportDtos.DayPoint(e.getKey(), e.getValue()[0], e.getValue()[1])).toList(),
                rows,
                slots.entrySet().stream().map(e -> new AmenityReportDtos.SlotPoint(e.getKey(), e.getValue()[0], e.getValue()[1])).toList(),
                statuses.entrySet().stream().map(e -> new AmenityReportDtos.StatusCount(e.getKey().name(), e.getValue())).toList());
    }

    public byte[] export(LocalDate from, LocalDate to, Long amenityId) {
        AmenityReportDtos.Report r = report(from, to, amenityId);
        Data d = load(from, to, amenityId);
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet summary = excel.sheet("Tổng quan", List.of("Chỉ số", "Giá trị"));
            excel.row(summary, List.of("Khoảng ngày", r.from() + " → " + r.to()));
            excel.row(summary, List.of("Tổng lượt đặt", r.totalBookings()));
            excel.row(summary, List.of("Lượt đang giữ chỗ / hoàn thành", r.activeBookings()));
            excel.row(summary, List.of("Lượt huỷ / từ chối", r.cancelledBookings()));
            excel.row(summary, List.of("Tổng số người", r.people()));
            excel.row(summary, List.of("Tỉ lệ lấp đầy (%)", Math.round(r.fillRate() * 1000) / 10.0));
            excel.row(summary, List.of("Tỉ lệ huỷ (%)", Math.round(r.cancelRate() * 1000) / 10.0));
            excel.row(summary, List.of("Doanh thu phải thu (đ)", r.revenue()));
            excel.row(summary, List.of("Đã thu (đ)", r.collected()));

            Sheet byAmenity = excel.sheet("Theo tiện ích", List.of("Mã", "Tiện ích", "Lượt đặt", "Huỷ / từ chối", "Số người",
                    "Sức chứa", "Lấp đầy (%)", "Doanh thu (đ)"));
            r.byAmenity().forEach(a -> excel.row(byAmenity, List.of(a.code(), a.name(), a.bookings(), a.cancelled(), a.people(),
                    a.capacity(), Math.round(a.fillRate() * 1000) / 10.0, a.revenue())));

            Sheet byDay = excel.sheet("Theo ngày", List.of("Ngày", "Lượt đặt", "Số người"));
            r.byDay().forEach(p -> excel.row(byDay, List.of(p.date(), p.bookings(), p.people())));

            Sheet bySlot = excel.sheet("Theo khung giờ", List.of("Giờ bắt đầu", "Lượt đặt", "Số người"));
            r.bySlot().forEach(p -> excel.row(bySlot, List.of(p.startTime(), p.bookings(), p.people())));

            Sheet detail = excel.sheet("Chi tiết", List.of("Mã đăng ký", "Tiện ích", "Căn hộ", "Ngày sử dụng", "Khung giờ",
                    "Số người", "Thành tiền (đ)", "Trạng thái", "Ngày tạo"));
            d.bookings().stream().sorted(Comparator.comparing(AmenityBooking::getBookingDate).thenComparing(AmenityBooking::getStartTime))
                    .forEach(b -> excel.row(detail, Arrays.asList(b.getCode(), b.getAmenity().getName(), b.getApartment().getCode(),
                            b.getBookingDate(), b.getStartTime() + "–" + b.getEndTime(), b.getPeopleCount(), b.getTotal(),
                            STATUS_LABELS.get(b.getStatus()), b.getCreatedAt())));
            return excel.toBytes();
        }
    }

    public String exportFileName(LocalDate from, LocalDate to) {
        return "bao-cao-tien-ich-" + from.format(FILE_DATE) + "-" + to.format(FILE_DATE) + ".xlsx";
    }

    private Data load(LocalDate from, LocalDate to, Long amenityId) {
        LocalDate today = LocalDate.now(clock.withZone(AppTime.ZONE));
        LocalDate start = from != null ? from : today.withDayOfMonth(1);
        LocalDate end = to != null ? to : start.withDayOfMonth(start.lengthOfMonth());
        if (end.isBefore(start)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "to", "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }
        if (ChronoUnit.DAYS.between(start, end) >= MAX_DAYS) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "to", "Khoảng thời gian tối đa " + MAX_DAYS + " ngày.");
        }
        List<Amenity> list;
        if (amenityId != null) {
            list = List.of(amenityService.requireAccessible(amenityId));
        } else {
            Optional<Set<Long>> scope = buildingService.listScope(null);
            Specification<Amenity> spec = scope.map(ids -> (Specification<Amenity>) (root, q, cb) ->
                    ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse((root, q, cb) -> cb.conjunction());
            list = amenities.findAll(spec);
        }
        Set<Long> ids = list.stream().map(Amenity::getId).collect(Collectors.toSet());
        Map<Long, AmenityConfig> configMap = ids.isEmpty() ? Map.of()
                : configs.findAllById(ids).stream().collect(Collectors.toMap(AmenityConfig::getAmenityId, Function.identity()));
        List<AmenityBooking> rows = ids.isEmpty() ? List.of()
                : bookings.findAll((root, q, cb) -> cb.and(root.get("amenityId").in(ids),
                        cb.between(root.get("bookingDate"), start, end)));
        Map<Long, FinancialTransaction> tx = rows.isEmpty() ? Map.of()
                : transactions.findBySourceTypeAndSourceIdIn(SourceType.AMENITY_BOOKING,
                        rows.stream().map(AmenityBooking::getId).toList()).stream()
                        .collect(Collectors.toMap(FinancialTransaction::getSourceId, Function.identity()));
        return new Data(start, end, list, configMap, rows, tx);
    }

    /** Tổng sức chứa các khung giờ của tiện ích trong khoảng (bỏ ngày bảo trì). */
    static long capacity(Amenity a, AmenityConfig config, LocalDate from, LocalDate to) {
        if (config == null) {
            return 0;
        }
        Map<Integer, Long> perDay = new LinkedHashMap<>();
        config.getSlots().forEach(s -> perDay.merge(s.getDayOfWeek(),
                (long) (s.getCapacity() != null ? s.getCapacity() : a.getCapacity()), Long::sum));
        long total = 0;
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            if (!config.isUnderMaintenance(day)) {
                total += perDay.getOrDefault(day.getDayOfWeek().getValue(), 0L);
            }
        }
        return total;
    }

    /** Doanh thu từ giao dịch của lượt đặt: phải thu (chưa thu + đã thu) hoặc chỉ đã thu. */
    private static BigDecimal revenue(List<AmenityBooking> list, Map<Long, FinancialTransaction> tx, boolean collectedOnly) {
        return list.stream().map(b -> tx.get(b.getId())).filter(t -> t != null)
                .filter(t -> collectedOnly ? t.getStatus() == FinancialTransaction.Status.PAID
                        : t.getStatus() == FinancialTransaction.Status.PAID || t.getStatus() == FinancialTransaction.Status.PENDING)
                .map(FinancialTransaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static double rate(long part, long total) {
        return total <= 0 ? 0 : Math.min(1.0, (double) part / total);
    }
}
