package com.bihome.feenotice;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentRepository;
import com.bihome.asset.AssetCategory;
import com.bihome.asset.AssetCategoryRepository;
import com.bihome.asset.AssetItemRepository;
import com.bihome.building.Building;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.messaging.MessageSender;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.BillingPeriods;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.feenotice.FeeNotice.Item;
import com.bihome.feenotice.FeeNotice.ItemType;
import com.bihome.feenotice.FeeNotice.Status;
import com.bihome.feenotice.dto.FeeNoticeDtos;
import com.bihome.feerate.FeeRateConfig;
import com.bihome.feerate.FeeRateService;
import com.bihome.meter.MeterReading;
import com.bihome.meter.MeterReadingRepository;
import com.bihome.payment.Payment;
import com.bihome.payment.PaymentRepository;
import com.bihome.resident.ApartmentResidentRepository;
import com.bihome.resident.ResidentAudienceService;
import com.bihome.resident.ResidentAudienceService.Audience;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.setting.SettingService;
import com.bihome.transaction.FinancialTransaction;
import com.bihome.transaction.FinancialTransactionRepository;
import com.bihome.vietqr.VietQrConfig;
import com.bihome.vietqr.VietQrService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thông báo phí: tạo hàng loạt (xem trước → xác nhận) thành nháp, sửa khoản khi còn nháp, phát hành, huỷ; số đã
 * thu cập nhật qua {@link #applyPayment}. Khoản tiện ích / dịch vụ chưa thanh toán được gắn vào thông báo ngay khi
 * tạo nháp (không vào hai thông báo); nợ kỳ trước chỉ chuyển hẳn sang thông báo mới khi phát hành.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeeNoticeService {

    static final int EXPORT_LIMIT = 10_000;
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "billingPeriod").and(Sort.by("apartment.code"));
    private static final Map<String, String> SORTS = Map.of("code", "code", "period", "billingPeriod",
            "apartmentCode", "apartment.code", "totalAmount", "totalAmount", "paidAmount", "paidAmount",
            "dueDate", "dueDate", "status", "status", "createdAt", "createdAt");
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final FeeNoticeRepository notices;
    private final ApartmentRepository apartments;
    private final ApartmentResidentRepository residentLinks;
    private final MeterReadingRepository meterReadings;
    private final AssetItemRepository assetItems;
    private final AssetCategoryRepository assetCategories;
    private final FinancialTransactionRepository transactions;
    private final PaymentRepository payments;
    private final FeeRateService feeRateService;
    private final VietQrService vietQrService;
    private final ResidentAudienceService audienceService;
    private final MessageSender messageSender;
    private final SettingService settingService;
    private final DailyCodeGenerator codes;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final Clock clock;

    // ---------------------------------------------------------------- Đọc

    public PageResponse<FeeNoticeDtos.Summary> list(FeeNoticeDtos.Filter f, PageParams pageParams) {
        var page = notices.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS));
        Map<Long, String> carried = carriedCodes(page.getContent());
        return PageResponse.of(page, n -> toSummary(n, carried));
    }

    public FeeNoticeDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    public FeeNoticeDtos.VietQr vietQr(Long id) {
        FeeNotice n = requireAccessible(id);
        return vietQrService.qrFor(n).orElseThrow(() -> new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                n.outstanding().signum() <= 0 ? "Thông báo phí không còn khoản nào cần thanh toán."
                        : "Tòa nhà chưa cấu hình hoặc đang tắt thanh toán VietQR."));
    }

    // ---------------------------------------------------------------- Tạo hàng loạt

    public FeeNoticeDtos.Preview preview(FeeNoticeDtos.GenerateRequest req) {
        Batch batch = batch(req);
        List<FeeNoticeDtos.PreviewRow> rows = batch.rows.stream().map(r -> new FeeNoticeDtos.PreviewRow(
                r.apartment.getId(), r.apartment.getCode(), r.apartment.getFloorNo(), r.holderName,
                r.result.items().stream().map(FeeNoticeService::toItem).toList(), r.result.total(), r.result.warnings(),
                r.skipReason)).toList();
        int toCreate = (int) batch.rows.stream().filter(r -> r.skipReason == null).count();
        BigDecimal total = batch.rows.stream().filter(r -> r.skipReason == null).map(r -> r.result.total())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int withWarnings = (int) batch.rows.stream().filter(r -> r.skipReason == null && !r.result.warnings().isEmpty())
                .count();
        return new FeeNoticeDtos.Preview(req.period(), batch.dueDate, rows.size(), toCreate, rows.size() - toCreate,
                withWarnings, total, rows);
    }

    @Transactional
    public FeeNoticeDtos.GenerateResult generate(FeeNoticeDtos.GenerateRequest req) {
        Batch batch = batch(req);
        buildingService.requireActive(batch.buildingId, "Tòa nhà đang không hoạt động, không tạo được thông báo phí.");
        int created = 0;
        for (Row r : batch.rows) {
            if (r.skipReason != null) {
                continue;
            }
            FeeNotice n = new FeeNotice();
            n.setBuildingId(batch.buildingId);
            n.setCode(codes.next("TB"));
            n.setBillingPeriod(req.period());
            n.setApartmentId(r.apartment.getId());
            n.setHolderName(r.holderName);
            n.setVatPercent(batch.config.getVatPercent());
            n.setDueDate(batch.dueDate);
            n.setStatus(Status.DRAFT);
            n.setItems(new ArrayList<>(r.result.items()));
            n.setTotalAmount(r.result.total());
            n = notices.save(n);
            link(n, r.unbilled);
            created++;
        }
        notices.flush();
        return new FeeNoticeDtos.GenerateResult(req.period(), created, batch.rows.size() - created);
    }

    // ---------------------------------------------------------------- Sửa nháp

    @Transactional
    public FeeNoticeDtos.Response update(Long id, FeeNoticeDtos.UpdateRequest req) {
        FeeNotice n = requireDraft(id, req.version());
        Map<String, Item> systemLines = n.getItems().stream().filter(i -> i.getSourceRef() != null
                        && (i.getType() == ItemType.SERVICE || i.getType() == ItemType.PREVIOUS_DEBT))
                .collect(Collectors.toMap(i -> i.getType() + "|" + i.getSourceRef(), Function.identity(), (a, b) -> a));
        List<Item> items = new ArrayList<>();
        Set<String> kept = new HashSet<>();
        for (int i = 0; i < req.items().size(); i++) {
            FeeNoticeDtos.ItemRequest r = req.items().get(i);
            String field = "items[" + i + "]";
            switch (r.type()) {
                case VAT -> {
                    // Tính lại bên dưới.
                }
                case SERVICE, PREVIOUS_DEBT -> {
                    Item existing = systemLines.get(r.type() + "|" + r.sourceRef());
                    if (existing == null) {
                        throw invalid(field, "Khoản tiện ích / nợ kỳ trước do hệ thống tạo, không thêm tay được.");
                    }
                    if (kept.add(r.type() + "|" + r.sourceRef())) {
                        items.add(existing);
                    }
                }
                case DISCOUNT -> {
                    if (r.amount() == null || r.amount().signum() == 0) {
                        throw invalid(field + ".amount", "Nhập số tiền giảm trừ.");
                    }
                    items.add(new Item(ItemType.DISCOUNT, r.description().trim(), null, null,
                            FeeCalculator.money(r.amount().abs()).negate(), null));
                }
                default -> {
                    BigDecimal amount;
                    if (r.quantity() != null && r.unitPrice() != null) {
                        amount = FeeCalculator.money(r.quantity().multiply(r.unitPrice()));
                    } else if (r.amount() != null && r.amount().signum() >= 0) {
                        amount = FeeCalculator.money(r.amount());
                    } else {
                        throw invalid(field + ".amount", "Nhập số lượng × đơn giá hoặc thành tiền (không âm).");
                    }
                    items.add(new Item(r.type(), r.description().trim(), r.quantity(), r.unitPrice(), amount,
                            trimToNull(r.sourceRef())));
                }
            }
        }
        List<Item> result = FeeCalculator.withVat(items, n.getVatPercent());
        BigDecimal total = FeeCalculator.total(result);
        if (total.signum() < 0) {
            throw invalid("items", "Tổng cộng không được âm (giảm trừ lớn hơn các khoản phí).");
        }
        // Bỏ dòng tiện ích / dịch vụ → trả khoản về danh sách chưa thu (vào thông báo kỳ sau).
        Set<String> removedTx = systemLines.keySet().stream().filter(k -> k.startsWith(ItemType.SERVICE + "|"))
                .filter(k -> !kept.contains(k)).map(k -> k.substring(k.indexOf('|') + 1)).collect(Collectors.toSet());
        transactions.findByFeeNoticeId(n.getId()).stream().filter(t -> removedTx.contains(t.getCode()))
                .forEach(t -> t.setFeeNoticeId(null));
        n.setItems(result);
        n.setTotalAmount(total);
        n.setDueDate(req.dueDate());
        n.setNote(trimToNull(req.note()));
        notices.flush();
        return toResponse(n);
    }

    /** Tính lại nháp theo số liệu / đơn giá hiện tại; giữ các dòng giảm trừ nhập tay. */
    @Transactional
    public FeeNoticeDtos.Response recalculate(Long id, Long version) {
        FeeNotice n = requireDraft(id, version);
        transactions.findByFeeNoticeId(n.getId()).forEach(t -> t.setFeeNoticeId(null));
        transactions.flush();
        Apartment apartment = apartments.findById(n.getApartmentId()).orElseThrow();
        FeeRateConfig config = feeRateService.forBuilding(n.getBuildingId());
        Map<Long, Row> rows = compute(n.getBuildingId(), n.getBillingPeriod(), List.of(apartment), config, Map.of());
        Row row = rows.get(apartment.getId());
        List<Item> items = new ArrayList<>(row.result.items());
        n.getItems().stream().filter(i -> i.getType() == ItemType.DISCOUNT).forEach(items::add);
        items = FeeCalculator.withVat(items, config.getVatPercent());
        BigDecimal total = FeeCalculator.total(items);
        if (total.signum() < 0) {
            throw invalid("items", "Tổng cộng sau tính lại bị âm, vui lòng sửa dòng giảm trừ.");
        }
        n.setVatPercent(config.getVatPercent());
        n.setHolderName(row.holderName);
        n.setItems(items);
        n.setTotalAmount(total);
        link(n, row.unbilled);
        notices.flush();
        return toResponse(n);
    }

    // ---------------------------------------------------------------- Phát hành / huỷ / xoá

    @Transactional
    public FeeNoticeDtos.Response issue(Long id, Long version, AuthUser actor) {
        FeeNotice n = requireDraft(id, version);
        doIssue(n, actor);
        notices.flush();
        return toResponse(n);
    }

    /** Phát hành mọi nháp của kỳ trong tòa đang chọn; nháp lỗi (nợ kỳ trước đã đổi...) giữ nguyên và báo lại. */
    @Transactional
    public FeeNoticeDtos.IssueAllResult issueAll(String period, AuthUser actor) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.findAccessible(buildingId);
        int issued = 0;
        List<String> errors = new ArrayList<>();
        for (Long id : notices.findDraftIds(buildingId, period)) {
            FeeNotice n = notices.findById(id).orElseThrow();
            try {
                doIssue(n, actor);
                issued++;
            } catch (BusinessException e) {
                errors.add(n.getCode() + ": " + e.getMessage());
            }
        }
        notices.flush();
        return new FeeNoticeDtos.IssueAllResult(issued, errors.size(), errors);
    }

    @Transactional
    public FeeNoticeDtos.Response cancel(Long id, FeeNoticeDtos.CancelRequest req) {
        FeeNotice n = requireAccessible(id);
        requireVersion(n, req.version());
        if (!FeeNotice.COLLECTIBLE.contains(n.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, n.getStatus() == Status.DRAFT
                    ? "Thông báo nháp thì xoá thay vì huỷ." : "Chỉ huỷ được thông báo phí đã phát hành và chưa thu tiền.");
        }
        if (n.getCarriedToId() != null) {
            throw new BusinessException(ErrorCode.CONFLICT, "Số nợ đã chuyển sang thông báo "
                    + notices.findById(n.getCarriedToId()).map(FeeNotice::getCode).orElse("khác") + ", không huỷ được.");
        }
        if (payments.countByFeeNoticeIdAndStatus(n.getId(), Payment.Status.VALID) > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "Thông báo phí đã có phiếu thu, huỷ phiếu thu trước.");
        }
        // Trả nợ về thông báo cũ (kèm khoản tiện ích / dịch vụ của nó); khoản của chính thông báo này về chưa thu.
        Map<String, Long> ownerOfTx = new HashMap<>();
        for (FeeNotice old : notices.findByCarriedToId(n.getId())) {
            old.setCarriedToId(null);
            old.getItems().stream().filter(i -> i.getType() == ItemType.SERVICE && i.getSourceRef() != null)
                    .forEach(i -> ownerOfTx.put(i.getSourceRef(), old.getId()));
        }
        transactions.findByFeeNoticeId(n.getId()).forEach(t -> t.setFeeNoticeId(ownerOfTx.get(t.getCode())));
        n.setStatus(Status.CANCELLED);
        n.setCancelReason(req.reason().trim());
        notices.flush();
        return toResponse(n);
    }

    @Transactional
    public void delete(Long id) {
        FeeNotice n = requireAccessible(id);
        if (n.getStatus() != Status.DRAFT) {
            throw new BusinessException(ErrorCode.CONFLICT, "Chỉ xoá được thông báo phí nháp; đã phát hành thì huỷ.");
        }
        transactions.findByFeeNoticeId(n.getId()).forEach(t -> t.setFeeNoticeId(null));
        transactions.flush();
        notices.delete(n);
    }

    // ---------------------------------------------------------------- Dùng từ phiếu thu / job

    /**
     * Cộng (hoặc trừ khi huỷ phiếu) số đã thu của thông báo đã khoá dòng, cập nhật trạng thái; thu đủ thì các khoản
     * tiện ích / dịch vụ gắn kèm cũng thành đã thanh toán (và ngược lại khi huỷ phiếu).
     */
    @Transactional
    public void applyPayment(FeeNotice n, BigDecimal delta, Payment.Method method, OffsetDateTime paidAt) {
        boolean wasPaid = n.getStatus() == Status.PAID;
        n.setPaidAmount(n.getPaidAmount().add(delta).max(BigDecimal.ZERO));
        n.setStatus(n.collectedStatus(today()));
        boolean paid = n.getStatus() == Status.PAID;
        if (paid && !wasPaid) {
            for (FinancialTransaction t : transactions.findByFeeNoticeId(n.getId())) {
                if (t.getStatus() == FinancialTransaction.Status.PENDING) {
                    t.setStatus(FinancialTransaction.Status.PAID);
                    t.setMethod(switch (method) {
                        case CASH -> FinancialTransaction.Method.CASH;
                        case BANK_TRANSFER -> FinancialTransaction.Method.BANK_TRANSFER;
                        case VIETQR -> FinancialTransaction.Method.VIETQR;
                    });
                    t.setPaidAt(paidAt);
                }
            }
        } else if (wasPaid && !paid) {
            for (FinancialTransaction t : transactions.findByFeeNoticeId(n.getId())) {
                if (t.getStatus() == FinancialTransaction.Status.PAID) {
                    t.setStatus(FinancialTransaction.Status.PENDING);
                    t.setMethod(null);
                    t.setPaidAt(null);
                }
            }
        }
    }

    /** Khoá dòng thông báo để thu tiền (kiểm tra quyền tòa ở người gọi). */
    @Transactional
    public FeeNotice lockForPayment(Long id) {
        return notices.findForUpdate(id).orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo phí."));
    }

    /** Job hằng ngày: đã phát hành / thu một phần mà quá hạn → Quá hạn. */
    @Transactional
    public int markOverdue() {
        LocalDate today = today();
        int count = 0;
        for (Long id : notices.findOverdueIds(EnumSet.of(Status.ISSUED, Status.PARTIAL), today)) {
            FeeNotice n = notices.findById(id).orElse(null);
            if (n != null && n.collectedStatus(today) == Status.OVERDUE) {
                n.setStatus(Status.OVERDUE);
                count++;
            }
        }
        return count;
    }

    // ---------------------------------------------------------------- Excel / PDF

    public byte[] export(FeeNoticeDtos.Filter f) {
        if (notices.count(spec(f)) > EXPORT_LIMIT) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Có hơn " + EXPORT_LIMIT + " thông báo phí, vui lòng lọc bớt trước khi xuất Excel.");
        }
        List<FeeNotice> rows = notices.findAll(spec(f), DEFAULT_SORT);
        return FeeNoticeExcel.export(rows, carriedCodes(rows));
    }

    public String exportFileName(FeeNoticeDtos.Filter f) {
        Long buildingId = f.buildingId() != null ? f.buildingId() : buildingContext.selectedBuildingId().orElse(null);
        String scope = buildingId == null ? "tat-ca" : buildingService.findAccessible(buildingId).getCode().toLowerCase();
        return "thong-bao-phi-" + scope + "-" + today().format(FILE_DATE) + ".xlsx";
    }

    public byte[] pdf(Long id) {
        FeeNotice n = requireAccessible(id);
        Building building = buildingService.findAccessible(n.getBuildingId());
        Optional<VietQrConfig> qrConfig = vietQrService.enabledFor(n.getBuildingId());
        return FeeNoticePdf.render(n, building, vietQrService.qrFor(n).orElse(null),
                qrConfig.map(c -> c.transferContent(n.getCode())).orElse(null),
                payments.findByFeeNoticeIdOrderByPaidAtAscIdAsc(n.getId()).stream()
                        .filter(p -> p.getStatus() == Payment.Status.VALID).toList(), settingService.current());
    }

    public String pdfFileName(Long id) {
        return "thong-bao-phi-" + requireAccessible(id).getCode().toLowerCase() + ".pdf";
    }

    public FeeNotice requireAccessible(Long id) {
        return notices.findById(id).filter(n -> buildingService.canAccess(n.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo phí."));
    }

    // ---------------------------------------------------------------- Nội bộ

    private static final class Row {
        Apartment apartment;
        String holderName;
        FeeCalculator.Result result;
        List<FinancialTransaction> unbilled;
        String skipReason;
    }

    private record Batch(Long buildingId, FeeRateConfig config, LocalDate dueDate, List<Row> rows) {
    }

    private Batch batch(FeeNoticeDtos.GenerateRequest req) {
        BillingPeriods.parse(req.period(), "period");
        if (BillingPeriods.isFuture(req.period(), today())) {
            throw invalid("period", "Chưa đến kỳ " + BillingPeriods.label(req.period()) + ".");
        }
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.findAccessible(buildingId);
        FeeRateConfig config = feeRateService.forBuilding(buildingId);
        LocalDate dueDate = req.dueDate() != null ? req.dueDate() : BillingPeriods.dueDate(req.period(), config.getDueDay());
        List<Apartment> list = apartments.findByBuildingIdAndStatusOrderByCodeAsc(buildingId, ActiveStatus.ACTIVE).stream()
                .filter(a -> req.floor() == null || req.floor().isBlank() || req.floor().equals(a.getFloorNo()))
                .filter(a -> req.apartmentIds() == null || req.apartmentIds().isEmpty() || req.apartmentIds().contains(a.getId()))
                .toList();
        if (list.isEmpty()) {
            throw invalid("apartmentIds", "Không có căn hộ đang hoạt động nào trong phạm vi đã chọn.");
        }
        Map<Long, String> existing = new HashMap<>();
        for (List<Long> chunk : chunks(list.stream().map(Apartment::getId).toList())) {
            notices.findActiveForPeriod(chunk, req.period()).forEach(n -> existing.put(n.getApartmentId(), n.getCode()));
        }
        Map<Long, Row> rows = compute(buildingId, req.period(), list, config, existing);
        return new Batch(buildingId, config, dueDate, list.stream().map(a -> rows.get(a.getId())).toList());
    }

    /** Tính phí cho các căn (nạp dữ liệu theo lô). {@code existing}: căn đã có thông báo kỳ này → bỏ qua. */
    private Map<Long, Row> compute(Long buildingId, String period, List<Apartment> list, FeeRateConfig config,
                                   Map<Long, String> existing) {
        Map<Long, String> categoryNames = assetCategories.findAllById(config.getParkingRates().stream()
                        .map(FeeRateConfig.ParkingRate::getAssetCategoryId).toList()).stream()
                .collect(Collectors.toMap(AssetCategory::getId, AssetCategory::getName));
        Map<Long, Map<String, MeterReading>> readings = new HashMap<>();
        Map<Long, Map<Long, Long>> parking = new HashMap<>();
        Map<Long, List<FinancialTransaction>> unbilled = new HashMap<>();
        Map<Long, List<FeeNotice>> unpaid = new HashMap<>();
        Map<Long, String> holders = new HashMap<>();
        for (List<Long> chunk : chunks(list.stream().map(Apartment::getId).toList())) {
            meterReadings.findForPeriod(chunk, period).forEach(r -> readings
                    .computeIfAbsent(r.getApartmentId(), k -> new HashMap<>()).put(r.getMeterType().name(), r));
            assetItems.countActiveByCategory(chunk).forEach(row -> parking
                    .computeIfAbsent((Long) row[0], k -> new HashMap<>()).put((Long) row[1], (Long) row[2]));
            transactions.findUnbilled(chunk).stream().filter(t -> buildingId.equals(t.getBuildingId()))
                    .forEach(t -> unbilled.computeIfAbsent(t.getApartmentId(), k -> new ArrayList<>()).add(t));
            notices.findUnpaidBefore(chunk, period, FeeNotice.COLLECTIBLE)
                    .forEach(n -> unpaid.computeIfAbsent(n.getApartmentId(), k -> new ArrayList<>()).add(n));
            holders.putAll(holderNames(chunk));
        }
        Map<Long, Row> result = new LinkedHashMap<>();
        for (Apartment a : list) {
            Row row = new Row();
            row.apartment = a;
            row.holderName = holders.get(a.getId());
            row.unbilled = unbilled.getOrDefault(a.getId(), List.of());
            Map<String, MeterReading> meters = readings.getOrDefault(a.getId(), Map.of());
            row.result = FeeCalculator.calculate(new FeeCalculator.Input(period, a.getType(), a.getArea(), config,
                    meters.get(MeterReading.MeterType.ELECTRIC.name()), meters.get(MeterReading.MeterType.WATER.name()),
                    parking.getOrDefault(a.getId(), Map.of()), categoryNames, row.unbilled,
                    unpaid.getOrDefault(a.getId(), List.of())));
            if (existing.containsKey(a.getId())) {
                row.skipReason = "Đã có thông báo " + existing.get(a.getId()) + " cho kỳ này.";
            } else if (row.result.items().isEmpty()) {
                row.skipReason = "Không có khoản phí nào.";
            }
            result.put(a.getId(), row);
        }
        return result;
    }

    /** Chủ hộ: chủ sở hữu đang ở, ưu tiên chủ hộ chính. */
    private Map<Long, String> holderNames(Collection<Long> apartmentIds) {
        Map<Long, Object[]> best = new HashMap<>();
        for (Object[] row : residentLinks.findOwners(apartmentIds, ResidentRole.OWNER, ResidenceStatus.MOVED_OUT)) {
            Object[] current = best.get((Long) row[0]);
            if (current == null || (Boolean) row[2] && !(Boolean) current[2]
                    || Objects.equals(row[2], current[2]) && (Long) row[3] < (Long) current[3]) {
                best.put((Long) row[0], row);
            }
        }
        Map<Long, String> result = new HashMap<>();
        best.forEach((id, row) -> result.put(id, (String) row[1]));
        return result;
    }

    private void link(FeeNotice n, List<FinancialTransaction> unbilled) {
        Set<String> codesInNotice = n.getItems().stream().filter(i -> i.getType() == ItemType.SERVICE)
                .map(Item::getSourceRef).collect(Collectors.toSet());
        unbilled.stream().filter(t -> codesInNotice.contains(t.getCode())).forEach(t -> t.setFeeNoticeId(n.getId()));
    }

    private void doIssue(FeeNotice n, AuthUser actor) {
        buildingService.requireActive(n.getBuildingId(), "Tòa nhà đang không hoạt động, không phát hành được.");
        List<String> debtCodes = n.getItems().stream().filter(i -> i.getType() == ItemType.PREVIOUS_DEBT)
                .map(Item::getSourceRef).toList();
        Map<String, FeeNotice> olds = debtCodes.isEmpty() ? Map.of() : notices.findByCodeIn(debtCodes).stream()
                .collect(Collectors.toMap(FeeNotice::getCode, Function.identity()));
        for (Item item : n.getItems()) {
            if (item.getType() != ItemType.PREVIOUS_DEBT) {
                continue;
            }
            FeeNotice old = olds.get(item.getSourceRef());
            if (old == null || old.getCarriedToId() != null || !FeeNotice.COLLECTIBLE.contains(old.getStatus())
                    || old.outstanding().compareTo(item.getAmount()) != 0) {
                throw new BusinessException(ErrorCode.CONFLICT, "Nợ kỳ trước (" + item.getSourceRef()
                        + ") đã thay đổi, vui lòng bấm \"Tính lại\" trước khi phát hành.");
            }
        }
        // Nợ cũ chuyển hẳn sang thông báo mới: khoản tiện ích / dịch vụ chưa thu của thông báo cũ đi theo.
        for (FeeNotice old : olds.values()) {
            old.setCarriedToId(n.getId());
            transactions.findByFeeNoticeId(old.getId()).stream()
                    .filter(t -> t.getStatus() == FinancialTransaction.Status.PENDING)
                    .forEach(t -> t.setFeeNoticeId(n.getId()));
        }
        n.setIssuedAt(OffsetDateTime.now(clock));
        n.setIssuedBy(actor.username());
        n.setStatus(n.collectedStatus(today()));
        sendToResidents(n);
    }

    /** Gửi email thông báo phí cho cư dân đang ở căn (môi trường thử chỉ ghi log); app cư dân dùng sau. */
    private void sendToResidents(FeeNotice n) {
        if (!settingService.current().feeNoticeEmail()) {
            return;
        }
        Apartment a = apartments.findById(n.getApartmentId()).orElseThrow();
        String subject = "Thông báo phí kỳ " + BillingPeriods.label(n.getBillingPeriod()) + " – căn " + a.getCode();
        String text = "Mã thông báo: " + n.getCode() + "\nTổng cộng: " + FeeCalculator.number(n.getTotalAmount())
                + " đ\nHạn thanh toán: " + n.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        for (ResidentAudienceService.Recipient r : audienceService.resolve(n.getBuildingId(), Audience.APARTMENT,
                Set.of(a.getId().toString()))) {
            if (r.email() != null && !r.email().isBlank()) {
                try {
                    messageSender.send(MessageSender.Channel.EMAIL, r.email(), subject, text);
                } catch (RuntimeException e) {
                    log.warn("Không gửi được thông báo phí {} tới {}: {}", n.getCode(), r.email(), e.getMessage());
                }
            }
        }
    }

    private FeeNotice requireDraft(Long id, Long version) {
        FeeNotice n = requireAccessible(id);
        requireVersion(n, version);
        if (n.getStatus() != Status.DRAFT) {
            throw new BusinessException(ErrorCode.CONFLICT, "Thông báo phí đã phát hành, không sửa được.");
        }
        return n;
    }

    private static void requireVersion(FeeNotice n, Long version) {
        if (!Objects.equals(n.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private Map<Long, String> carriedCodes(List<FeeNotice> list) {
        Set<Long> ids = list.stream().map(FeeNotice::getCarriedToId).filter(Objects::nonNull).collect(Collectors.toSet());
        return ids.isEmpty() ? Map.of() : notices.findAllById(ids).stream()
                .collect(Collectors.toMap(FeeNotice::getId, FeeNotice::getCode));
    }

    private Specification<FeeNotice> spec(FeeNoticeDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<FeeNotice>create()
                .likeAny(f.keyword(), "code", "apartment.code", "holderName")
                .like("code", f.code())
                .eq("billingPeriod", trimToNull(f.period()))
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .eq("status", f.status())
                .localDateBetween("dueDate", f.dueFrom(), f.dueTo())
                .and(Boolean.TRUE.equals(f.unpaid()) ? (root, q, cb) -> cb.and(root.get("status").in(FeeNotice.COLLECTIBLE),
                        cb.isNull(root.get("carriedToId"))) : null)
                .and(scope.map(ids -> (Specification<FeeNotice>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private FeeNoticeDtos.Summary toSummary(FeeNotice n, Map<Long, String> carried) {
        return new FeeNoticeDtos.Summary(n.getId(), n.getBuildingId(), n.getBuilding().getName(), n.getCode(),
                n.getBillingPeriod(), n.getApartmentId(), n.getApartment().getCode(), n.getHolderName(),
                n.getTotalAmount(), n.getPaidAmount(), n.outstanding(), n.getDueDate(), n.getStatus(), n.getCarriedToId(),
                n.getCarriedToId() == null ? null : carried.get(n.getCarriedToId()), n.getIssuedAt(), n.getCreatedAt(),
                n.getVersion());
    }

    private FeeNoticeDtos.Response toResponse(FeeNotice n) {
        Building b = n.getBuilding();
        Map<Long, String> carried = carriedCodes(List.of(n));
        Optional<VietQrConfig> qr = vietQrService.enabledFor(n.getBuildingId());
        List<FeeNoticeDtos.PaymentItem> paymentItems = payments.findByFeeNoticeIdOrderByPaidAtAscIdAsc(n.getId()).stream()
                .map(p -> new FeeNoticeDtos.PaymentItem(p.getId(), p.getCode(), p.getAmount(), p.getMethod(), p.getPaidAt(),
                        p.getCollectorName(), p.getReconcileStatus(), p.getStatus())).toList();
        List<FeeNoticeDtos.Link> from = notices.findByCarriedToId(n.getId()).stream()
                .sorted(Comparator.comparing(FeeNotice::getBillingPeriod))
                .map(o -> new FeeNoticeDtos.Link(o.getId(), o.getCode(), o.getBillingPeriod())).toList();
        return new FeeNoticeDtos.Response(toSummary(n, carried), n.getApartment().getFloorNo(),
                b.getAddressDetail() + ", " + b.getWard() + ", " + b.getProvince(), n.getVatPercent(),
                n.getItems().stream().map(FeeNoticeService::toItem).toList(), n.getNote(), n.getIssuedBy(),
                n.getCancelReason(), paymentItems, from, qr.isPresent() && n.outstanding().signum() > 0,
                qr.map(c -> c.transferContent(n.getCode())).orElse(null), n.getCreatedBy(), n.getUpdatedAt(),
                n.getUpdatedBy());
    }

    static FeeNoticeDtos.ItemResponse toItem(Item i) {
        return new FeeNoticeDtos.ItemResponse(i.getType(), i.getDescription(), i.getQuantity(), i.getUnitPrice(),
                i.getAmount(), i.getSourceRef());
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(AppTime.ZONE));
    }

    private static List<List<Long>> chunks(List<Long> ids) {
        List<List<Long>> result = new ArrayList<>();
        for (int i = 0; i < ids.size(); i += 1000) {
            result.add(ids.subList(i, Math.min(ids.size(), i + 1000)));
        }
        return result;
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static BusinessException invalid(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }
}
