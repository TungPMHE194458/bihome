package com.bihome.payment;

import com.bihome.building.Building;
import com.bihome.building.BuildingService;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.BillingPeriods;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.feenotice.FeeCalculator;
import com.bihome.feenotice.FeeNotice;
import com.bihome.feenotice.FeeNoticeService;
import com.bihome.payment.Payment.Method;
import com.bihome.payment.Payment.ReconcileStatus;
import com.bihome.payment.Payment.Status;
import com.bihome.payment.dto.PaymentDtos;
import com.bihome.setting.SettingService;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Sheet;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phiếu thu thông báo phí. Thu tay (tiền mặt khớp ngay; chuyển khoản / VietQR nhập tay chờ đối soát) hoặc tự động
 * từ webhook ngân hàng. Khoá dòng thông báo phí khi thu / huỷ để số đã thu đúng khi thao tác đồng thời.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    static final int EXPORT_LIMIT = 10_000;
    static final String SYSTEM_COLLECTOR = "Hệ thống (VietQR)";
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "paidAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of("code", "code", "amount", "amount", "paidAt", "paidAt",
            "apartmentCode", "apartment.code", "createdAt", "createdAt");
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    static final Map<Method, String> METHOD_LABELS = new EnumMap<>(Map.of(
            Method.CASH, "Tiền mặt", Method.BANK_TRANSFER, "Chuyển khoản", Method.VIETQR, "VietQR"));
    static final Map<ReconcileStatus, String> RECONCILE_LABELS = new EnumMap<>(Map.of(
            ReconcileStatus.MATCHED, "Đã khớp", ReconcileStatus.PENDING, "Chờ khớp", ReconcileStatus.MISMATCHED, "Lệch"));

    private final PaymentRepository payments;
    private final FeeNoticeService feeNoticeService;
    private final AppUserRepository users;
    private final SettingService settingService;
    private final DailyCodeGenerator codes;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final EntityManager entityManager;
    private final Clock clock;

    public PageResponse<PaymentDtos.Response> list(PaymentDtos.Filter f, PageParams pageParams) {
        return PageResponse.of(payments.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS)),
                PaymentService::toResponse);
    }

    public PaymentDtos.Response get(Long id) {
        return toResponse(requireAccessible(id));
    }

    @Transactional
    public PaymentDtos.Response create(PaymentDtos.CreateRequest req, AuthUser actor) {
        FeeNotice n = lockAccessible(req.feeNoticeId());
        requireCollectible(n);
        BigDecimal amount = FeeCalculator.money(req.amount());
        if (amount.compareTo(n.outstanding()) > 0) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "amount", "Số tiền vượt số còn nợ ("
                    + FeeCalculator.number(n.outstanding()) + " đ).");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime paidAt = req.paidAt() == null ? now : req.paidAt();
        if (paidAt.isAfter(now.plus(Duration.ofMinutes(5)))) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "paidAt", "Thời gian thu không được ở tương lai.");
        }
        Payment p = newPayment(n, amount, req.method(), paidAt, collectorName(actor));
        p.setPayerName(trimToNull(req.payerName()));
        p.setBankReference(trimToNull(req.bankReference()));
        p.setNote(trimToNull(req.note()));
        p.setReconcileStatus(req.method() == Method.CASH ? ReconcileStatus.MATCHED : ReconcileStatus.PENDING);
        p = payments.save(p);
        feeNoticeService.applyPayment(n, amount, req.method(), paidAt);
        return reload(p.getId());
    }

    /**
     * Phiếu thu từ biến động số dư (thông báo đã khoá dòng): khớp đúng số còn nợ → Đã khớp, khác → Lệch (vẫn ghi
     * nhận số tiền thực nhận).
     */
    @Transactional
    public Payment recordAutomatic(FeeNotice lockedNotice, BigDecimal amount, String bankReference,
                                   OffsetDateTime transactedAt, String note) {
        BigDecimal value = FeeCalculator.money(amount);
        Payment p = newPayment(lockedNotice, value, Method.VIETQR, transactedAt, SYSTEM_COLLECTOR);
        p.setBankReference(bankReference);
        p.setNote(note);
        p.setReconcileStatus(value.compareTo(lockedNotice.outstanding()) == 0 ? ReconcileStatus.MATCHED
                : ReconcileStatus.MISMATCHED);
        p = payments.save(p);
        feeNoticeService.applyPayment(lockedNotice, value, Method.VIETQR, transactedAt);
        return p;
    }

    @Transactional
    public PaymentDtos.Response reconcile(Long id, PaymentDtos.ReconcileRequest req) {
        Payment p = requireAccessible(id);
        requireVersion(p, req.version());
        if (p.getStatus() != Status.VALID) {
            throw new BusinessException(ErrorCode.CONFLICT, "Phiếu thu đã huỷ.");
        }
        if (req.status() == ReconcileStatus.PENDING) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "status", "Chọn Đã khớp hoặc Lệch.");
        }
        p.setReconcileStatus(req.status());
        if (req.bankReference() != null && !req.bankReference().isBlank()) {
            p.setBankReference(req.bankReference().trim());
        }
        payments.flush();
        return toResponse(p);
    }

    /** Huỷ phiếu (cần lý do): trừ lại số đã thu của thông báo phí. */
    @Transactional
    public PaymentDtos.Response cancel(Long id, PaymentDtos.CancelRequest req, AuthUser actor) {
        Payment p = requireAccessible(id);
        requireVersion(p, req.version());
        if (p.getStatus() != Status.VALID) {
            throw new BusinessException(ErrorCode.CONFLICT, "Phiếu thu đã huỷ trước đó.");
        }
        FeeNotice n = feeNoticeService.lockForPayment(p.getFeeNoticeId());
        if (n.getCarriedToId() != null) {
            throw new BusinessException(ErrorCode.CONFLICT, "Số nợ của thông báo phí " + n.getCode()
                    + " đã chuyển sang kỳ sau, không huỷ được phiếu thu.");
        }
        p.setStatus(Status.CANCELLED);
        p.setCancelReason(req.reason().trim());
        p.setCancelledAt(OffsetDateTime.now(clock));
        p.setCancelledBy(actor.username());
        feeNoticeService.applyPayment(n, p.getAmount().negate(), p.getMethod(), null);
        return reload(p.getId());
    }

    public byte[] receipt(Long id) {
        Payment p = requireAccessible(id);
        Building b = buildingService.findAccessible(p.getBuildingId());
        return ReceiptPdf.render(p, b, settingService.current());
    }

    public String receiptFileName(Long id) {
        return "phieu-thu-" + requireAccessible(id).getCode().toLowerCase() + ".pdf";
    }

    public byte[] export(PaymentDtos.Filter f) {
        if (payments.count(spec(f)) > EXPORT_LIMIT) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Có hơn " + EXPORT_LIMIT + " phiếu thu, vui lòng lọc bớt trước khi xuất Excel.");
        }
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Phiếu thu", List.of("Mã phiếu thu", "Thông báo phí", "Kỳ", "Tòa nhà", "Căn hộ",
                    "Số tiền", "Phương thức", "Thời gian", "Người thu", "Người nộp", "Mã giao dịch ngân hàng",
                    "Đối soát", "Trạng thái", "Lý do huỷ", "Ghi chú"));
            for (Payment p : payments.findAll(spec(f), DEFAULT_SORT)) {
                excel.row(sheet, Arrays.asList(p.getCode(), p.getFeeNotice().getCode(),
                        BillingPeriods.label(p.getFeeNotice().getBillingPeriod()), p.getBuilding().getName(),
                        p.getApartment().getCode(), p.getAmount(), METHOD_LABELS.get(p.getMethod()), p.getPaidAt(),
                        p.getCollectorName(), p.getPayerName(), p.getBankReference(),
                        RECONCILE_LABELS.get(p.getReconcileStatus()), p.getStatus() == Status.VALID ? "Hợp lệ" : "Đã huỷ",
                        p.getCancelReason(), p.getNote()));
            }
            return excel.toBytes();
        }
    }

    public String exportFileName(PaymentDtos.Filter f) {
        Long buildingId = f.buildingId() != null ? f.buildingId() : buildingContext.selectedBuildingId().orElse(null);
        String scope = buildingId == null ? "tat-ca" : buildingService.findAccessible(buildingId).getCode().toLowerCase();
        return "phieu-thu-" + scope + "-" + LocalDate.now(clock.withZone(AppTime.ZONE)).format(FILE_DATE) + ".xlsx";
    }

    // ---------------------------------------------------------------- Nội bộ

    /** Khoá dòng trước rồi mới kiểm tra quyền tòa (đọc lại trạng thái mới nhất sau khi có khoá). */
    private FeeNotice lockAccessible(Long noticeId) {
        FeeNotice n = feeNoticeService.lockForPayment(noticeId);
        if (!buildingService.canAccess(n.getBuildingId())) {
            throw new NotFoundException("Không tìm thấy thông báo phí.");
        }
        return n;
    }

    public static void requireCollectible(FeeNotice n) {
        if (n.getCarriedToId() != null) {
            throw new BusinessException(ErrorCode.CONFLICT, "Số nợ của thông báo " + n.getCode()
                    + " đã chuyển sang kỳ sau, vui lòng thu theo thông báo mới.");
        }
        if (!FeeNotice.COLLECTIBLE.contains(n.getStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, switch (n.getStatus()) {
                case DRAFT -> "Thông báo phí chưa phát hành.";
                case PAID -> "Thông báo phí đã thanh toán đủ.";
                default -> "Thông báo phí đã huỷ.";
            });
        }
    }

    private Payment newPayment(FeeNotice n, BigDecimal amount, Method method, OffsetDateTime paidAt, String collector) {
        Payment p = new Payment();
        p.setBuildingId(n.getBuildingId());
        p.setCode(codes.next("PT"));
        p.setFeeNoticeId(n.getId());
        p.setApartmentId(n.getApartmentId());
        p.setAmount(amount);
        p.setMethod(method);
        p.setPaidAt(paidAt);
        p.setCollectorName(collector);
        p.setStatus(Status.VALID);
        return p;
    }

    private String collectorName(AuthUser actor) {
        return users.findWithProfileByIdIn(List.of(actor.id())).stream().findFirst().map(AppUser::getProfile)
                .map(profile -> profile.getFullName()).filter(Objects::nonNull).orElse(actor.username());
    }

    private PaymentDtos.Response reload(Long id) {
        entityManager.flush();
        entityManager.clear();
        return toResponse(payments.findById(id).orElseThrow());
    }

    private Payment requireAccessible(Long id) {
        return payments.findById(id).filter(p -> buildingService.canAccess(p.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phiếu thu."));
    }

    private static void requireVersion(Payment p, Long version) {
        if (!Objects.equals(p.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private Specification<Payment> spec(PaymentDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<Payment>create()
                .likeAny(f.keyword(), "code", "feeNotice.code", "apartment.code", "payerName", "bankReference")
                .like("code", f.code())
                .eq("feeNoticeId", f.feeNoticeId())
                .like("feeNotice.code", f.feeNotice())
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .eq("method", f.method())
                .eq("reconcileStatus", f.reconcileStatus())
                .eq("status", f.status())
                .dateBetween("paidAt", f.from(), f.to())
                .and(scope.map(ids -> (Specification<Payment>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    static PaymentDtos.Response toResponse(Payment p) {
        return new PaymentDtos.Response(p.getId(), p.getBuildingId(), p.getBuilding().getName(), p.getCode(),
                p.getFeeNoticeId(), p.getFeeNotice().getCode(), p.getFeeNotice().getBillingPeriod(), p.getApartmentId(),
                p.getApartment().getCode(), p.getAmount(), p.getMethod(), p.getPaidAt(), p.getCollectorName(),
                p.getPayerName(), p.getBankReference(), p.getReconcileStatus(), p.getNote(), p.getStatus(),
                p.getCancelReason(), p.getCancelledAt(), p.getCancelledBy(), p.getCreatedAt(), p.getCreatedBy(),
                p.getVersion());
    }

    private static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
