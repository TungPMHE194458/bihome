package com.bihome.vietqr;

import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.feenotice.FeeCalculator;
import com.bihome.feenotice.FeeNotice;
import com.bihome.feenotice.FeeNoticeRepository;
import com.bihome.feenotice.FeeNoticeService;
import com.bihome.notification.NotificationService;
import com.bihome.notification.NotificationType;
import com.bihome.payment.Payment;
import com.bihome.payment.PaymentRepository;
import com.bihome.payment.PaymentService;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import com.bihome.vietqr.BankTransaction.MatchStatus;
import com.bihome.vietqr.dto.VietQrDtos;
import com.bihome.vietqr.dto.VietQrDtos.WebhookStatus;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Biến động số dư từ ngân hàng: mỗi mã tham chiếu xử lý một lần; tìm mã thông báo phí trong nội dung chuyển khoản
 * (chấp nhận ngân hàng bỏ / thêm gạch nối, khoảng trắng) → tạo phiếu thu VietQR tự động.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BankWebhookService {

    /** "TB-261011-001", "TB261011001", "TB 261011 001"... */
    static final Pattern NOTICE_CODE = Pattern.compile("TB[\\s\\-_.]?(\\d{6})[\\s\\-_.]?(\\d{3,6})");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "transactedAt").and(Sort.by(Sort.Direction.DESC, "id"));

    private final BankTransactionRepository bankTransactions;
    private final VietQrConfigRepository configs;
    private final VietQrService vietQrService;
    private final FeeNoticeRepository notices;
    private final FeeNoticeService feeNoticeService;
    private final PaymentService paymentService;
    private final PaymentRepository payments;
    private final NotificationService notificationService;
    private final AppUserRepository users;
    private final BuildingService buildingService;
    private final Clock clock;

    @Transactional
    public VietQrDtos.WebhookResult receive(VietQrDtos.WebhookEvent e, boolean simulated) {
        String account = e.accountNo() == null ? null : e.accountNo().trim().toUpperCase(Locale.ROOT);
        Set<Long> accountBuildings = account == null ? Set.of() : configs.findByAccountNo(account).stream()
                .map(VietQrConfig::getBuildingId).collect(Collectors.toSet());
        return receive(e, simulated, accountBuildings);
    }

    /**
     * Chỉ khớp thông báo phí của các tòa sở hữu tài khoản nhận tiền ({@code allowedBuildings}); tài khoản lạ thì không
     * khớp gì (tránh nội dung chuyển khoản nhắc mã của tòa khác ghi tiền nhầm tòa).
     */
    private VietQrDtos.WebhookResult receive(VietQrDtos.WebhookEvent e, boolean simulated, Set<Long> allowedBuildings) {
        String reference = e.reference().trim();
        Optional<BankTransaction> existing = bankTransactions.findByBankReference(reference);
        if (existing.isPresent()) {
            BankTransaction bt = existing.get();
            return new VietQrDtos.WebhookResult(WebhookStatus.DUPLICATE, bt.getId(), null, null,
                    "Giao dịch " + reference + " đã được xử lý trước đó.");
        }
        BankTransaction bt = new BankTransaction();
        bt.setBankReference(reference);
        bt.setAccountNo(e.accountNo() == null ? null : e.accountNo().trim().toUpperCase(Locale.ROOT));
        bt.setAmount(FeeCalculator.money(e.amount()));
        bt.setContent(e.content());
        bt.setTransactedAt(e.transactedAt() == null ? OffsetDateTime.now(clock) : e.transactedAt());
        bt.setSimulated(simulated);

        bt.setBuildingId(allowedBuildings.size() == 1 ? allowedBuildings.iterator().next() : null);
        Optional<String> code = extractCode(e.content());
        FeeNotice notice = code.flatMap(notices::findByCode)
                .filter(n -> allowedBuildings.contains(n.getBuildingId())).orElse(null);
        if (notice == null) {
            bt.setMatchStatus(MatchStatus.UNMATCHED);
            bt.setMatchNote(allowedBuildings.isEmpty() ? "Tài khoản nhận tiền không thuộc tòa nào trên hệ thống."
                    : code.map(c -> "Không tìm thấy thông báo phí " + c + " của tài khoản này.")
                    .orElse("Nội dung chuyển khoản không có mã thông báo phí."));
            bt = bankTransactions.save(bt);
            return new VietQrDtos.WebhookResult(WebhookStatus.UNMATCHED, bt.getId(), code.orElse(null), null, bt.getMatchNote());
        }

        FeeNotice locked = feeNoticeService.lockForPayment(notice.getId());
        bt.setBuildingId(locked.getBuildingId());
        bt.setFeeNoticeId(locked.getId());
        try {
            PaymentService.requireCollectible(locked);
        } catch (BusinessException ex) {
            bt.setMatchStatus(MatchStatus.UNMATCHED);
            bt.setMatchNote(ex.getMessage());
            bt = bankTransactions.save(bt);
            return new VietQrDtos.WebhookResult(WebhookStatus.UNMATCHED, bt.getId(), locked.getCode(), null, ex.getMessage());
        }
        BigDecimal outstanding = locked.outstanding();
        Payment p = paymentService.recordAutomatic(locked, bt.getAmount(), reference, bt.getTransactedAt(),
                simulated ? "Giả lập biến động số dư" : "Tự động từ biến động số dư");
        boolean matched = p.getReconcileStatus() == Payment.ReconcileStatus.MATCHED;
        bt.setMatchStatus(matched ? MatchStatus.MATCHED : MatchStatus.MISMATCHED);
        bt.setMatchNote(matched ? null : "Nhận " + FeeCalculator.number(bt.getAmount()) + " đ, số còn nợ là "
                + FeeCalculator.number(outstanding) + " đ.");
        bt.setPaymentId(p.getId());
        bt = bankTransactions.save(bt);
        notifyStaff(locked, p, matched);
        return new VietQrDtos.WebhookResult(matched ? WebhookStatus.MATCHED : WebhookStatus.MISMATCHED, bt.getId(),
                locked.getCode(), p.getCode(), bt.getMatchNote());
    }

    /** Giả lập ngân hàng báo có cho một thông báo phí (môi trường thử). */
    @Transactional
    public VietQrDtos.WebhookResult simulate(VietQrDtos.SimulateRequest req) {
        if (!vietQrService.isSimulationEnabled()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Môi trường này không bật giả lập thanh toán.");
        }
        FeeNotice n = feeNoticeService.requireAccessible(req.feeNoticeId());
        Optional<VietQrConfig> config = configs.findById(n.getBuildingId());
        String content = req.content() != null && !req.content().isBlank() ? req.content().trim()
                : config.map(c -> c.transferContent(n.getCode())).orElse(VietQrPayload.sanitize("BIHOME " + n.getCode()));
        BigDecimal amount = req.amount() != null ? req.amount() : n.outstanding();
        if (amount.signum() <= 0) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "amount", "Thông báo phí không còn nợ, nhập số tiền.");
        }
        String reference = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        // Chỉ được khớp vào thông báo của chính tòa này dù nội dung nhập tay nhắc mã khác.
        return receive(new VietQrDtos.WebhookEvent(reference, config.map(VietQrConfig::getAccountNo).orElse(null),
                amount, content, OffsetDateTime.now(clock)), true, Set.of(n.getBuildingId()));
    }

    public PageResponse<VietQrDtos.BankTransactionResponse> list(VietQrDtos.BankTransactionFilter f, PageParams pageParams) {
        var page = bankTransactions.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, Map.of(
                "transactedAt", "transactedAt", "amount", "amount", "createdAt", "createdAt")));
        Set<Long> noticeIds = page.getContent().stream().map(BankTransaction::getFeeNoticeId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> paymentIds = page.getContent().stream().map(BankTransaction::getPaymentId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> noticeCodes = noticeIds.isEmpty() ? Map.of() : notices.findAllById(noticeIds).stream()
                .collect(Collectors.toMap(FeeNotice::getId, FeeNotice::getCode));
        Map<Long, String> paymentCodes = paymentIds.isEmpty() ? Map.of() : payments.findAllById(paymentIds).stream()
                .collect(Collectors.toMap(Payment::getId, Payment::getCode));
        return PageResponse.of(page, b -> new VietQrDtos.BankTransactionResponse(b.getId(), b.getBuildingId(),
                b.getBankReference(), b.getAccountNo(), b.getAmount(), b.getContent(), b.getTransactedAt(),
                b.getMatchStatus(), b.getMatchNote(), b.getFeeNoticeId(),
                b.getFeeNoticeId() == null ? null : noticeCodes.get(b.getFeeNoticeId()), b.getPaymentId(),
                b.getPaymentId() == null ? null : paymentCodes.get(b.getPaymentId()), b.isSimulated(), b.getCreatedAt()));
    }

    static Optional<String> extractCode(String content) {
        if (content == null) {
            return Optional.empty();
        }
        Matcher m = NOTICE_CODE.matcher(content.toUpperCase(Locale.ROOT));
        return m.find() ? Optional.of("TB-" + m.group(1) + "-" + m.group(2)) : Optional.empty();
    }

    private void notifyStaff(FeeNotice n, Payment p, boolean matched) {
        var recipients = users.findHandlers("PAYMENT_WRITE", n.getBuildingId(), UserStatus.ACTIVE).stream()
                .filter(u -> u.getBuildingIds().contains(n.getBuildingId())).map(AppUser::getId).toList();
        notificationService.notify(recipients, NotificationType.PAYMENT_RECEIVED,
                "Nhận " + FeeCalculator.number(p.getAmount()) + " đ qua VietQR – " + n.getCode(),
                matched ? "Đã khớp tự động, phiếu thu " + p.getCode() : "Lệch số tiền, cần kiểm tra phiếu " + p.getCode(),
                "/payments?view=" + p.getId(), n.getBuildingId());
    }

    private Specification<BankTransaction> spec(VietQrDtos.BankTransactionFilter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<BankTransaction>create()
                .likeAny(f.keyword(), "bankReference", "content", "accountNo")
                .eq("matchStatus", f.matchStatus())
                .dateBetween("transactedAt", f.from(), f.to())
                .and(scope.map(ids -> (Specification<BankTransaction>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }
}
