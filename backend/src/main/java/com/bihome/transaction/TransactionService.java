package com.bihome.transaction;

import com.bihome.building.BuildingService;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.DailyCodeGenerator;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.transaction.FinancialTransaction.Method;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.transaction.FinancialTransaction.Status;
import com.bihome.transaction.dto.TransactionDtos;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Sheet;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Giao dịch phát sinh từ nghiệp vụ khác. Nguồn gọi {@link #record} khi có phí, {@link #pay} khi ghi nhận thanh
 * toán, {@link #cancel} / {@link #refund} khi huỷ. Danh sách chỉ đọc + xuất Excel.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionService {

    static final int EXPORT_LIMIT = 10_000;
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of(
            "code", "code", "amount", "amount", "createdAt", "createdAt", "paidAt", "paidAt", "status", "status");
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    static final Map<SourceType, String> SOURCE_LABELS = new EnumMap<>(Map.of(
            SourceType.AMENITY_BOOKING, "Tiện ích", SourceType.SERVICE_ORDER, "Dịch vụ",
            SourceType.ACCESS_CARD, "Thẻ từ", SourceType.FEE_NOTICE, "Thông báo phí"));
    static final Map<Method, String> METHOD_LABELS = new EnumMap<>(Map.of(
            Method.CASH, "Tiền mặt", Method.BANK_TRANSFER, "Chuyển khoản", Method.VIETQR, "VietQR", Method.CARD, "Thẻ"));
    static final Map<Status, String> STATUS_LABELS = new EnumMap<>(Map.of(
            Status.PENDING, "Chưa thanh toán", Status.PAID, "Đã thanh toán",
            Status.CANCELLED, "Đã huỷ", Status.REFUNDED, "Đã hoàn tiền"));

    private final FinancialTransactionRepository transactions;
    private final DailyCodeGenerator codes;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final FeeNoticeLinks feeNoticeLinks;
    private final Clock clock;

    // ---------------------------------------------------------------- Dùng từ nghiệp vụ nguồn

    /** Tạo giao dịch chưa thanh toán; số tiền 0 thì không tạo (trả rỗng). */
    @Transactional
    public Optional<FinancialTransaction> record(SourceType type, Long sourceId, String sourceCode, Long buildingId,
                                                 Long apartmentId, Long residentId, BigDecimal amount, String description) {
        if (amount == null || amount.signum() <= 0) {
            return Optional.empty();
        }
        FinancialTransaction t = new FinancialTransaction();
        t.setBuildingId(buildingId);
        t.setCode(codes.next("GD"));
        t.setSourceType(type);
        t.setSourceId(sourceId);
        t.setSourceCode(sourceCode);
        t.setApartmentId(apartmentId);
        t.setResidentId(residentId);
        t.setAmount(amount);
        t.setStatus(Status.PENDING);
        t.setDescription(description);
        return Optional.of(transactions.save(t));
    }

    public Optional<FinancialTransaction> find(SourceType type, Long sourceId) {
        return transactions.findBySourceTypeAndSourceId(type, sourceId);
    }

    public Map<Long, TransactionDtos.Summary> summaries(SourceType type, Collection<Long> sourceIds) {
        if (sourceIds.isEmpty()) {
            return Map.of();
        }
        return transactions.findBySourceTypeAndSourceIdIn(type, sourceIds).stream()
                .collect(Collectors.toMap(FinancialTransaction::getSourceId, TransactionService::summary));
    }

    @Transactional
    public FinancialTransaction pay(SourceType type, Long sourceId, Method method) {
        FinancialTransaction t = find(type, sourceId).orElseThrow(() ->
                new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Không có khoản phí nào cần thanh toán."));
        if (t.getStatus() != Status.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Giao dịch " + t.getCode() + " đang ở trạng thái \""
                    + STATUS_LABELS.get(t.getStatus()) + "\", không ghi nhận thanh toán được.");
        }
        if (t.getFeeNoticeId() != null) {
            throw new BusinessException(ErrorCode.CONFLICT, "Khoản phí " + t.getCode() + " đã đưa vào thông báo phí "
                    + feeNoticeLinks.noticeCode(t.getFeeNoticeId()) + ", vui lòng thu qua thông báo phí.");
        }
        t.setStatus(Status.PAID);
        t.setMethod(method);
        t.setPaidAt(OffsetDateTime.now(clock));
        return t;
    }

    /** Huỷ khoản chưa thanh toán; khoản đã thanh toán giữ nguyên (người gọi quyết định hoàn tiền). */
    @Transactional
    public Optional<FinancialTransaction> cancel(SourceType type, Long sourceId) {
        Optional<FinancialTransaction> t = find(type, sourceId);
        t.filter(x -> x.getStatus() == Status.PENDING).ifPresent(x -> {
            if (x.getFeeNoticeId() != null) {
                feeNoticeLinks.release(x);
            }
            x.setStatus(Status.CANCELLED);
        });
        return t;
    }

    @Transactional
    public Optional<FinancialTransaction> refund(SourceType type, Long sourceId) {
        Optional<FinancialTransaction> t = find(type, sourceId);
        t.filter(x -> x.getStatus() == Status.PAID).ifPresent(x -> x.setStatus(Status.REFUNDED));
        return t;
    }

    public static TransactionDtos.Summary summary(FinancialTransaction t) {
        return new TransactionDtos.Summary(t.getId(), t.getCode(), t.getStatus(), t.getMethod(), t.getPaidAt(),
                t.getFeeNoticeId());
    }

    // ---------------------------------------------------------------- Danh sách

    public PageResponse<TransactionDtos.Response> list(TransactionDtos.Filter f, PageParams pageParams) {
        return PageResponse.of(transactions.findAll(spec(f), pageParams.toPageable(DEFAULT_SORT, SORTS)),
                TransactionService::toResponse);
    }

    public byte[] export(TransactionDtos.Filter f) {
        if (transactions.count(spec(f)) > EXPORT_LIMIT) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Có hơn " + EXPORT_LIMIT + " giao dịch, vui lòng lọc bớt trước khi xuất Excel.");
        }
        List<FinancialTransaction> rows = transactions.findAll(spec(f), DEFAULT_SORT);
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Giao dịch", List.of("Mã giao dịch", "Loại nguồn", "Mã tham chiếu", "Tòa nhà",
                    "Căn hộ", "Cư dân", "Số tiền", "Phương thức", "Trạng thái", "Thời gian", "Thanh toán lúc", "Nội dung"));
            for (FinancialTransaction t : rows) {
                excel.row(sheet, Arrays.asList(t.getCode(), SOURCE_LABELS.get(t.getSourceType()), t.getSourceCode(),
                        t.getBuilding().getName(), t.getApartment() == null ? null : t.getApartment().getCode(),
                        t.getResident() == null ? null : t.getResident().getFullName(), t.getAmount(),
                        t.getMethod() == null ? null : METHOD_LABELS.get(t.getMethod()), STATUS_LABELS.get(t.getStatus()),
                        t.getCreatedAt(), t.getPaidAt(), t.getDescription()));
            }
            return excel.toBytes();
        }
    }

    public String exportFileName(TransactionDtos.Filter f) {
        Long buildingId = f.buildingId() != null ? f.buildingId() : buildingContext.selectedBuildingId().orElse(null);
        String scope = buildingId == null ? "tat-ca" : buildingService.findAccessible(buildingId).getCode().toLowerCase();
        return "giao-dich-" + scope + "-" + LocalDate.now(clock.withZone(AppTime.ZONE)).format(FILE_DATE) + ".xlsx";
    }

    private Specification<FinancialTransaction> spec(TransactionDtos.Filter f) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        return SpecificationBuilder.<FinancialTransaction>create()
                .likeAny(f.keyword(), "code", "sourceCode", "description", "apartment.code", "resident.fullName")
                .like("code", f.code())
                .eq("sourceType", f.sourceType())
                .like("sourceCode", f.sourceCode())
                .eq("apartmentId", f.apartmentId())
                .like("apartment.code", f.apartment())
                .eq("method", f.method())
                .eq("status", f.status())
                .dateBetween("createdAt", f.from(), f.to())
                .and(scope.map(ids -> (Specification<FinancialTransaction>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
    }

    private static TransactionDtos.Response toResponse(FinancialTransaction t) {
        return new TransactionDtos.Response(t.getId(), t.getBuildingId(), t.getBuilding().getName(), t.getCode(),
                t.getSourceType(), t.getSourceId(), t.getSourceCode(), t.getApartmentId(),
                t.getApartment() == null ? null : t.getApartment().getCode(), t.getResidentId(),
                t.getResident() == null ? null : t.getResident().getFullName(), t.getAmount(), t.getMethod(),
                t.getStatus(), t.getDescription(), t.getPaidAt(), t.getCreatedAt(), t.getCreatedBy(), t.getFeeNoticeId());
    }
}
