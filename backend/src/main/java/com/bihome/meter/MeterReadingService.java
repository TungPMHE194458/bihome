package com.bihome.meter;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentRepository;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.excel.ExcelReader;
import com.bihome.common.excel.ImportResult;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.BillingPeriods;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.feenotice.FeeNoticeRepository;
import com.bihome.meter.MeterReading.MeterType;
import com.bihome.meter.dto.MeterReadingDtos;
import com.bihome.resident.ResidentAudienceService;
import jakarta.persistence.EntityManager;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.web.multipart.MultipartFile;

/**
 * Số liệu đồng hồ điện / nước. Chỉ số cũ luôn là chỉ số mới của kỳ liền trước (chuỗi theo căn + loại đồng hồ); thêm,
 * sửa, xoá một kỳ thì tính lại các kỳ sau. Kỳ đã có thông báo phí phát hành thì bị khoá.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeterReadingService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "billingPeriod")
            .and(Sort.by("apartment.code")).and(Sort.by("meterType"));
    private static final Map<String, String> SORTS = Map.of("period", "billingPeriod", "apartmentCode", "apartment.code",
            "meterType", "meterType", "consumption", "consumption", "newIndex", "newIndex", "createdAt", "createdAt");
    private static final int AVERAGE_PERIODS = 3;

    private final MeterReadingRepository readings;
    private final ApartmentRepository apartments;
    private final ApartmentService apartmentService;
    private final FeeNoticeRepository feeNotices;
    private final FileService fileService;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final ResidentAudienceService audienceService;
    private final EntityManager entityManager;
    private final Clock clock;

    // ---------------------------------------------------------------- Đọc

    public PageResponse<MeterReadingDtos.Response> list(MeterReadingDtos.Filter f, PageParams pageParams) {
        var page = readings.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS));
        Set<String> locked = lockedKeys(page.getContent());
        Set<Long> firsts = firstReadingIds(page.getContent());
        return PageResponse.of(page, r -> toResponse(r, locked.contains(key(r.getApartmentId(), r.getBillingPeriod())),
                firsts.contains(r.getId())));
    }

    public MeterReadingDtos.Response get(Long id) {
        MeterReading r = requireAccessible(id);
        return toResponse(r, feeNotices.isLocked(r.getApartmentId(), r.getBillingPeriod()), isFirst(r));
    }

    /** Chỉ số cũ / trung bình cho form thêm (căn + loại + kỳ). */
    public MeterReadingDtos.PreviousInfo previous(Long apartmentId, MeterType type, String period) {
        BillingPeriods.parse(period, "period");
        Apartment apartment = apartmentService.requireAccessible(apartmentId);
        List<MeterReading> before = readings.findChain(apartment.getId(), type).stream()
                .filter(r -> r.getBillingPeriod().compareTo(period) < 0).toList();
        MeterReading last = before.isEmpty() ? null : before.getLast();
        Long existingId = readings.findByApartmentIdAndMeterTypeAndBillingPeriod(apartmentId, type, period)
                .map(MeterReading::getId).orElse(null);
        return new MeterReadingDtos.PreviousInfo(last == null ? null : last.getNewIndex(),
                last == null ? null : last.getBillingPeriod(), average(before),
                feeNotices.isLocked(apartmentId, period), existingId);
    }

    // ---------------------------------------------------------------- Ghi

    @Transactional
    public MeterReadingDtos.Response create(MeterReadingDtos.CreateRequest req, AuthUser actor) {
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        requireWritable(apartment, req.period());
        if (readings.findByApartmentIdAndMeterTypeAndBillingPeriod(apartment.getId(), req.meterType(), req.period())
                .isPresent()) {
            throw BusinessException.field(ErrorCode.CONFLICT, "period", "Căn " + apartment.getCode() + " đã có chỉ số "
                    + typeLabel(req.meterType()) + " kỳ " + BillingPeriods.label(req.period()) + ".");
        }
        MeterReading r = new MeterReading();
        r.setBuildingId(apartment.getBuildingId());
        r.setApartmentId(apartment.getId());
        r.setBillingPeriod(req.period());
        r.setMeterType(req.meterType());
        r.setOldIndex(scale(req.oldIndex() == null ? BigDecimal.ZERO : req.oldIndex()));
        r.setNewIndex(scale(req.newIndex()));
        r.setNote(trimToNull(req.note()));
        r.setImageFileId(image(req.imageFileId(), null, actor));
        applyChain(r, false);
        // Bản ghi mới chưa có quan hệ chỉ đọc (tòa, căn hộ): đọc lại.
        entityManager.clear();
        return get(r.getId());
    }

    @Transactional
    public MeterReadingDtos.Response update(Long id, MeterReadingDtos.UpdateRequest req, AuthUser actor) {
        MeterReading r = requireAccessible(id);
        if (!Objects.equals(r.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        requireNotLocked(r.getApartmentId(), r.getBillingPeriod());
        Long oldImage = r.getImageFileId();
        Long newImage = image(req.imageFileId(), oldImage, actor);
        r.setNewIndex(scale(req.newIndex()));
        if (req.oldIndex() != null) {
            r.setOldIndex(scale(req.oldIndex()));
        }
        r.setNote(trimToNull(req.note()));
        r.setImageFileId(newImage);
        applyChain(r, false);
        if (oldImage != null && !oldImage.equals(newImage)) {
            fileService.deleteAll(List.of(oldImage));
        }
        return get(id);
    }

    @Transactional
    public void delete(Long id) {
        MeterReading r = requireAccessible(id);
        requireNotLocked(r.getApartmentId(), r.getBillingPeriod());
        applyChain(r, true);
        if (r.getImageFileId() != null) {
            fileService.deleteAll(List.of(r.getImageFileId()));
        }
    }

    // ---------------------------------------------------------------- Lưới nhập nhanh theo tầng

    public MeterReadingDtos.Sheet sheet(String period, MeterType type, String floor) {
        BillingPeriods.parse(period, "period");
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.findAccessible(buildingId);
        List<Apartment> list = apartments.findByBuildingIdAndStatusOrderByCodeAsc(buildingId, ActiveStatus.ACTIVE)
                .stream().filter(a -> floor == null || floor.isBlank() || floor.equals(a.getFloorNo())).toList();
        List<Long> ids = list.stream().map(Apartment::getId).toList();
        Map<Long, MeterReading> current = new HashMap<>();
        Map<Long, MeterReading> previous = new HashMap<>();
        Set<Long> locked = new HashSet<>();
        Map<Long, BigDecimal> averages = new HashMap<>();
        for (List<Long> chunk : chunks(ids)) {
            readings.findForPeriod(chunk, period).stream().filter(r -> r.getMeterType() == type)
                    .forEach(r -> current.put(r.getApartmentId(), r));
            readings.findLatestBefore(chunk, type, period).forEach(r -> previous.put(r.getApartmentId(), r));
            locked.addAll(feeNotices.findLockedApartments(chunk, period));
        }
        // Trung bình 3 kỳ trước chỉ cần cho căn chưa có số liệu kỳ này (đã có thì lấy từ bản ghi).
        for (Apartment a : list) {
            if (!current.containsKey(a.getId()) && previous.containsKey(a.getId())) {
                averages.put(a.getId(), average(readings.findChain(a.getId(), type).stream()
                        .filter(r -> r.getBillingPeriod().compareTo(period) < 0).toList()));
            }
        }
        List<MeterReadingDtos.SheetRow> rows = list.stream().map(a -> {
            MeterReading cur = current.get(a.getId());
            MeterReading prev = previous.get(a.getId());
            BigDecimal old = cur != null ? cur.getOldIndex() : prev == null ? null : prev.getNewIndex();
            return new MeterReadingDtos.SheetRow(a.getId(), a.getCode(), a.getFloorNo(), old,
                    prev == null ? null : prev.getBillingPeriod(),
                    cur != null ? cur.getAverageConsumption() : averages.get(a.getId()),
                    cur == null ? null : cur.getId(), cur == null ? null : cur.getNewIndex(),
                    cur == null ? null : cur.getConsumption(), cur != null && cur.isSpike(), locked.contains(a.getId()),
                    cur == null ? null : cur.getVersion());
        }).toList();
        return new MeterReadingDtos.Sheet(period, type, audienceService.floors(buildingId), rows);
    }

    /**
     * Lưu cả lưới: dòng có chỉ số mới thì thêm / cập nhật, dòng trống bỏ qua. Lỗi ở dòng nào thì không lưu dòng nào
     * (lỗi trả theo trường {@code rows[i].newIndex}).
     */
    @Transactional
    public MeterReadingDtos.SheetResult saveSheet(MeterReadingDtos.SheetRequest req) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không nhập được số liệu.");
        requireNotFuture(req.period());
        Map<Long, Apartment> byId = apartments.findAllById(req.rows().stream().map(MeterReadingDtos.SheetEntry::apartmentId)
                .collect(Collectors.toSet())).stream().collect(Collectors.toMap(Apartment::getId, Function.identity()));
        int created = 0;
        int updated = 0;
        int unchanged = 0;
        for (int i = 0; i < req.rows().size(); i++) {
            MeterReadingDtos.SheetEntry e = req.rows().get(i);
            if (e.newIndex() == null) {
                continue;
            }
            String field = "rows[" + i + "].newIndex";
            Apartment a = byId.get(e.apartmentId());
            if (a == null || !a.getBuildingId().equals(buildingId)) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, field, "Căn hộ không thuộc tòa nhà đang chọn.");
            }
            try {
                switch (upsert(a, req.period(), req.meterType(), e.oldIndex(), e.newIndex(), null)) {
                    case CREATED -> created++;
                    case UPDATED -> updated++;
                    default -> unchanged++;
                }
            } catch (BusinessException ex) {
                throw BusinessException.field(ex.getErrorCode(), field, a.getCode() + ": " + ex.getMessage());
            }
        }
        return new MeterReadingDtos.SheetResult(created, updated, unchanged);
    }

    // ---------------------------------------------------------------- Excel

    public byte[] importTemplate() {
        return MeterReadingExcel.template();
    }

    /** Nhập chỉ số cho kỳ đã chọn của tòa đang chọn; dòng đã có số liệu thì cập nhật chỉ số mới. */
    @Transactional
    public ImportResult importExcel(MultipartFile file, String period, boolean stopOnError) {
        BillingPeriods.parse(period, "period");
        requireNotFuture(period);
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không nhập được số liệu.");
        byte[] data = ExcelReader.requireXlsx(file);
        List<ExcelReader.ExcelRow> rows = ExcelReader.read(new ByteArrayInputStream(data), MeterReadingExcel.REQUIRED);
        if (rows.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "File không có dòng dữ liệu nào.");
        }
        List<MeterReadingExcel.Parsed> parsed = rows.stream().map(MeterReadingExcel::parse).toList();
        Set<String> codes = parsed.stream().map(MeterReadingExcel.Parsed::apartmentCode).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, Apartment> byCode = codes.isEmpty() ? Map.of() : apartments.findByBuildingIdAndCodeIn(buildingId, codes)
                .stream().collect(Collectors.toMap(Apartment::getCode, Function.identity()));
        Set<String> seen = new HashSet<>();
        List<ImportResult.Row> results = new ArrayList<>();
        boolean failed = false;
        for (MeterReadingExcel.Parsed p : parsed) {
            String error = p.error();
            Apartment a = p.apartmentCode() == null ? null : byCode.get(p.apartmentCode());
            if (error == null && a == null) {
                error = "Không tìm thấy căn hộ " + p.apartmentCode() + " trong tòa đang chọn.";
            }
            if (error == null && !seen.add(p.apartmentCode() + "|" + p.meterType())) {
                error = "Trùng căn hộ và loại đồng hồ với dòng phía trên.";
            }
            if (error == null) {
                try {
                    Outcome outcome = upsert(a, period, p.meterType(), p.oldIndex(), p.newIndex(), p.note());
                    results.add(new ImportResult.Row(p.rowNumber(), p.key(), true,
                            outcome == Outcome.CREATED ? "Đã thêm" : outcome == Outcome.UPDATED ? "Đã cập nhật" : "Không đổi"));
                    continue;
                } catch (BusinessException ex) {
                    error = ex.getMessage();
                }
            }
            failed = true;
            results.add(new ImportResult.Row(p.rowNumber(), p.key(), false, error));
        }
        if (failed && stopOnError) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return ImportResult.of(results.stream().map(r -> r.success()
                    ? new ImportResult.Row(r.rowNumber(), r.key(), true, "Hợp lệ (chưa nhập vì file còn dòng lỗi)")
                    : r).toList(), false);
        }
        return ImportResult.of(results, true);
    }

    // ---------------------------------------------------------------- Nội bộ

    enum Outcome { CREATED, UPDATED, UNCHANGED }

    private Outcome upsert(Apartment a, String period, MeterType type, BigDecimal oldIndex, BigDecimal newIndex,
                           String note) {
        requireNotLocked(a.getId(), period);
        Optional<MeterReading> existing = readings.findByApartmentIdAndMeterTypeAndBillingPeriod(a.getId(), type, period);
        if (existing.isPresent()) {
            MeterReading r = existing.get();
            boolean same = r.getNewIndex().compareTo(newIndex) == 0
                    && (oldIndex == null || r.getOldIndex().compareTo(oldIndex) == 0)
                    && (note == null || note.equals(r.getNote()));
            if (same) {
                return Outcome.UNCHANGED;
            }
            r.setNewIndex(scale(newIndex));
            if (oldIndex != null) {
                r.setOldIndex(scale(oldIndex));
            }
            if (note != null) {
                r.setNote(note);
            }
            applyChain(r, false);
            return Outcome.UPDATED;
        }
        MeterReading r = new MeterReading();
        r.setBuildingId(a.getBuildingId());
        r.setApartmentId(a.getId());
        r.setBillingPeriod(period);
        r.setMeterType(type);
        r.setOldIndex(scale(oldIndex == null ? BigDecimal.ZERO : oldIndex));
        r.setNewIndex(scale(newIndex));
        r.setNote(note);
        applyChain(r, false);
        return Outcome.CREATED;
    }

    /**
     * Tính lại chuỗi kỳ của đồng hồ sau khi thêm / sửa ({@code removed = false}) hoặc xoá {@code changed}: chỉ số cũ
     * = chỉ số mới kỳ liền trước, tiêu thụ, trung bình 3 kỳ trước. Kiểm tra hết rồi mới ghi để lỗi không để lại dữ
     * liệu dở dang.
     */
    private void applyChain(MeterReading changed, boolean removed) {
        List<MeterReading> chain = new ArrayList<>(readings.findChain(changed.getApartmentId(), changed.getMeterType())
                .stream().filter(r -> !r.equals(changed) && !Objects.equals(r.getId(), changed.getId())).toList());
        if (!removed) {
            chain.add(changed);
            chain.sort((x, y) -> x.getBillingPeriod().compareTo(y.getBillingPeriod()));
        }
        record Values(MeterReading reading, BigDecimal oldIndex, BigDecimal consumption, BigDecimal average) {
        }
        List<Values> updates = new ArrayList<>();
        List<BigDecimal> consumptions = new ArrayList<>();
        MeterReading previous = null;
        for (MeterReading r : chain) {
            BigDecimal old = previous == null ? r.getOldIndex() : previous.getNewIndex();
            BigDecimal consumption = r.getNewIndex().subtract(old);
            BigDecimal avg = averageOf(consumptions);
            boolean isChanged = r == changed;
            if (consumption.signum() < 0) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "newIndex", isChanged
                        ? "Chỉ số mới (" + plain(r.getNewIndex()) + ") nhỏ hơn chỉ số cũ (" + plain(old) + ")."
                        : "Chỉ số kỳ " + BillingPeriods.label(r.getBillingPeriod()) + " (" + plain(r.getNewIndex())
                        + ") nhỏ hơn chỉ số mới của kỳ trước nó (" + plain(old) + ").");
            }
            boolean differs = isChanged || r.getOldIndex().compareTo(old) != 0
                    || r.getConsumption().compareTo(consumption) != 0 || !Objects.equals(r.getAverageConsumption(), avg);
            if (differs) {
                if (!isChanged && (r.getOldIndex().compareTo(old) != 0)
                        && feeNotices.isLocked(r.getApartmentId(), r.getBillingPeriod())) {
                    throw new BusinessException(ErrorCode.CONFLICT, "Thay đổi này làm đổi chỉ số cũ của kỳ "
                            + BillingPeriods.label(r.getBillingPeriod()) + " đã phát hành thông báo phí.");
                }
                updates.add(new Values(r, old, consumption, avg));
            }
            consumptions.add(consumption);
            previous = r;
        }
        if (removed) {
            readings.delete(changed);
        }
        for (Values v : updates) {
            v.reading().setOldIndex(v.oldIndex());
            v.reading().setConsumption(v.consumption());
            v.reading().setAverageConsumption(v.average());
            if (v.reading().getId() == null) {
                readings.save(v.reading());
            }
        }
        readings.flush();
    }

    /** Trung bình tiêu thụ tối đa 3 kỳ gần nhất của danh sách (đã sắp theo kỳ); null nếu chưa có kỳ nào. */
    static BigDecimal average(List<MeterReading> before) {
        return averageOf(before.stream().map(MeterReading::getConsumption).toList());
    }

    static BigDecimal averageOf(List<BigDecimal> consumptions) {
        if (consumptions.isEmpty()) {
            return null;
        }
        List<BigDecimal> last = consumptions.subList(Math.max(0, consumptions.size() - AVERAGE_PERIODS), consumptions.size());
        BigDecimal sum = last.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(last.size()), 2, RoundingMode.HALF_UP);
    }

    private void requireWritable(Apartment apartment, String period) {
        buildingService.requireActive(apartment.getBuildingId(), "Tòa nhà đang không hoạt động, không nhập được số liệu.");
        if (apartment.getStatus() != ActiveStatus.ACTIVE) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "apartmentId", "Căn hộ đã ngừng hoạt động.");
        }
        requireNotFuture(period);
        requireNotLocked(apartment.getId(), period);
    }

    private void requireNotFuture(String period) {
        if (BillingPeriods.isFuture(period, LocalDate.now(clock.withZone(AppTime.ZONE)))) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "period", "Chưa đến kỳ " + BillingPeriods.label(period) + ".");
        }
    }

    private void requireNotLocked(Long apartmentId, String period) {
        if (feeNotices.isLocked(apartmentId, period)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Kỳ " + BillingPeriods.label(period)
                    + " đã phát hành thông báo phí, không sửa được số liệu.");
        }
    }

    private Long image(Long requested, Long current, AuthUser actor) {
        if (requested == null || requested.equals(current)) {
            return requested;
        }
        fileService.requireOwnUpload(requested, FilePurpose.METER_IMAGE, actor, "imageFileId", "Ảnh đồng hồ không hợp lệ.");
        return requested;
    }

    private MeterReading requireAccessible(Long id) {
        return readings.findById(id).filter(r -> buildingService.canAccess(r.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy số liệu."));
    }

    private boolean isFirst(MeterReading r) {
        List<MeterReading> chain = readings.findChain(r.getApartmentId(), r.getMeterType());
        return !chain.isEmpty() && chain.getFirst().getId().equals(r.getId());
    }

    private Set<Long> firstReadingIds(List<MeterReading> page) {
        if (page.isEmpty()) {
            return Set.of();
        }
        Map<String, String> firstPeriod = new HashMap<>();
        readings.findFirstPeriods(page.stream().map(MeterReading::getApartmentId).collect(Collectors.toSet()))
                .forEach(row -> firstPeriod.put(row[0] + "|" + row[1], (String) row[2]));
        return page.stream().filter(r -> r.getBillingPeriod().equals(firstPeriod.get(r.getApartmentId() + "|" + r.getMeterType())))
                .map(MeterReading::getId).collect(Collectors.toSet());
    }

    private Set<String> lockedKeys(List<MeterReading> page) {
        Map<String, List<Long>> byPeriod = page.stream().collect(Collectors.groupingBy(MeterReading::getBillingPeriod,
                Collectors.mapping(MeterReading::getApartmentId, Collectors.toList())));
        Set<String> result = new HashSet<>();
        byPeriod.forEach((period, ids) -> feeNotices.findLockedApartments(ids, period)
                .forEach(id -> result.add(key(id, period))));
        return result;
    }

    private static String key(Long apartmentId, String period) {
        return apartmentId + "|" + period;
    }

    private Specification<MeterReading> spec(MeterReadingDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<MeterReading>create()
                .likeAny(f.keyword(), "apartment.code", "note")
                .eq("billingPeriod", blankToNull(f.period()))
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .eq("apartment.floorNo", blankToNull(f.floor()))
                .eq("meterType", f.meterType())
                .and(Boolean.TRUE.equals(f.spike()) ? (root, q, cb) -> cb.and(
                        cb.isNotNull(root.get("averageConsumption")),
                        cb.greaterThan(root.get("averageConsumption"), BigDecimal.ZERO),
                        cb.greaterThan(root.get("consumption"),
                                cb.prod(root.<BigDecimal>get("averageConsumption"), MeterReading.SPIKE_RATIO))) : null)
                .and(scope.map(ids -> (Specification<MeterReading>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private MeterReadingDtos.Response toResponse(MeterReading r, boolean locked, boolean first) {
        return new MeterReadingDtos.Response(r.getId(), r.getBuildingId(), r.getBuilding().getName(), r.getApartmentId(),
                r.getApartment().getCode(), r.getApartment().getFloorNo(), r.getBillingPeriod(), r.getMeterType(),
                r.getOldIndex(), r.getNewIndex(), r.getConsumption(), r.getAverageConsumption(), r.isSpike(), locked,
                first, r.getImageFileId(), r.getImageFileId() == null ? null : fileService.urlFor(r.getImageFileId()),
                r.getNote(), r.getCreatedBy(), r.getCreatedAt(), r.getUpdatedBy(), r.getUpdatedAt(), r.getVersion());
    }

    static String typeLabel(MeterType type) {
        return type == MeterType.ELECTRIC ? "điện" : "nước";
    }

    private static List<List<Long>> chunks(List<Long> ids) {
        List<List<Long>> result = new ArrayList<>();
        for (int i = 0; i < ids.size(); i += 1000) {
            result.add(ids.subList(i, Math.min(ids.size(), i + 1000)));
        }
        return result;
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private static String plain(BigDecimal v) {
        return v.stripTrailingZeros().toPlainString();
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
