package com.bihome.voucher;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.transaction.FinancialTransaction.SourceType;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.Voucher.DiscountType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Áp dụng voucher cho đăng ký tiện ích / đơn dịch vụ: kiểm tra tòa, trạng thái, hiệu lực theo ngày sử dụng, phạm vi,
 * tiện ích / dịch vụ cụ thể, tổng số lượng và giới hạn mỗi căn. Khi dùng thật thì khoá dòng voucher (SELECT ... FOR
 * UPDATE) để hai lượt cùng lúc không vượt số lượng.
 */
@Service
@RequiredArgsConstructor
public class VoucherRedemptionService {

    private static final String FIELD = "voucherCode";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final VoucherRepository vouchers;
    private final VoucherUsageRepository usages;
    private final Clock clock;

    /** Đối tượng áp voucher: {@code kind} = AMENITY hoặc SERVICE. */
    public record Target(ApplyScope kind, Long targetId, Long buildingId, Long apartmentId, LocalDate usageDate) {
    }

    public record Redemption(Voucher voucher, BigDecimal discount) {
    }

    /** Xem trước (không khoá, không tính lượt) — cho form hiển thị giảm giá. */
    @Transactional(readOnly = true)
    public Optional<Redemption> preview(String code, Target target, BigDecimal amount) {
        return normalize(code).map(c -> evaluate(vouchers.findByCode(c), target, amount));
    }

    /** Dùng voucher: khoá dòng, kiểm tra, tăng số lượt đã dùng. Ghi lượt dùng bằng {@link #recordUsage}. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<Redemption> redeem(String code, Target target, BigDecimal amount) {
        Optional<Redemption> result = normalize(code).map(c -> evaluate(vouchers.findByCodeForUpdate(c), target, amount));
        result.ifPresent(r -> r.voucher().setUsedCount(r.voucher().getUsedCount() + 1));
        return result;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordUsage(Redemption redemption, Long apartmentId, SourceType sourceType, Long sourceId) {
        VoucherUsage usage = new VoucherUsage();
        usage.setVoucherId(redemption.voucher().getId());
        usage.setApartmentId(apartmentId);
        usage.setSourceType(sourceType);
        usage.setSourceId(sourceId);
        usage.setDiscount(redemption.discount());
        usage.setUsedAt(OffsetDateTime.now(clock));
        usages.save(usage);
    }

    /** Trả lại lượt dùng (huỷ / từ chối): xoá lượt và giảm số đã dùng của voucher. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void release(SourceType sourceType, Long sourceId) {
        usages.findBySourceTypeAndSourceId(sourceType, sourceId).ifPresent(usage -> {
            vouchers.findByIdForUpdate(usage.getVoucherId())
                    .ifPresent(v -> v.setUsedCount(Math.max(0, v.getUsedCount() - 1)));
            usages.delete(usage);
        });
    }

    private Redemption evaluate(Optional<Voucher> found, Target target, BigDecimal amount) {
        Voucher v = found.filter(x -> x.getBuildingId().equals(target.buildingId()))
                .orElseThrow(() -> invalid("Mã voucher không tồn tại ở tòa nhà này."));
        if (v.getStatus() != ActiveStatus.ACTIVE) {
            throw invalid("Voucher đang ngừng hoạt động.");
        }
        if (target.usageDate().isBefore(v.getValidFrom()) || target.usageDate().isAfter(v.getValidTo())) {
            throw invalid("Voucher chỉ có hiệu lực từ " + v.getValidFrom().format(DAY) + " đến " + v.getValidTo().format(DAY) + ".");
        }
        boolean amenity = target.kind() == ApplyScope.AMENITY;
        if (v.getApplyScope() != ApplyScope.ALL && v.getApplyScope() != target.kind()) {
            throw invalid(amenity ? "Voucher chỉ áp dụng cho dịch vụ." : "Voucher chỉ áp dụng cho tiện ích.");
        }
        Set<Long> targets = amenity ? v.getAmenityIds() : v.getServiceIds();
        if (!targets.isEmpty() && !targets.contains(target.targetId())) {
            throw invalid(amenity ? "Voucher không áp dụng cho tiện ích này." : "Voucher không áp dụng cho dịch vụ này.");
        }
        if (amount.signum() <= 0) {
            throw invalid("Lượt này miễn phí, không cần dùng voucher.");
        }
        if (v.isSoldOut()) {
            throw invalid("Voucher đã hết lượt sử dụng.");
        }
        if (v.getPerApartmentLimit() != null
                && usages.countByVoucherIdAndApartmentId(v.getId(), target.apartmentId()) >= v.getPerApartmentLimit()) {
            throw invalid("Căn hộ đã dùng hết " + v.getPerApartmentLimit() + " lượt của voucher này.");
        }
        return new Redemption(v, discount(v, amount));
    }

    static BigDecimal discount(Voucher v, BigDecimal amount) {
        BigDecimal d = v.getDiscountType() == DiscountType.PERCENT
                ? amount.multiply(v.getDiscountValue()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                : v.getDiscountValue();
        if (v.getDiscountType() == DiscountType.PERCENT && v.getMaxDiscount() != null) {
            d = d.min(v.getMaxDiscount());
        }
        return d.min(amount).setScale(0, RoundingMode.HALF_UP);
    }

    private static Optional<String> normalize(String code) {
        return code == null || code.isBlank() ? Optional.empty() : Optional.of(code.trim().toUpperCase(Locale.ROOT));
    }

    private static BusinessException invalid(String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, FIELD, message);
    }
}
