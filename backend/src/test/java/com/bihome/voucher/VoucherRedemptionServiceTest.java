package com.bihome.voucher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.Voucher.DiscountType;
import com.bihome.voucher.VoucherRedemptionService.Target;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoucherRedemptionServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 20);

    @Mock VoucherRepository vouchers;
    @Mock VoucherUsageRepository usages;

    VoucherRedemptionService service;
    Voucher voucher;

    @BeforeEach
    void setUp() {
        service = new VoucherRedemptionService(vouchers, usages, Clock.systemUTC());
        voucher = new Voucher();
        voucher.setId(1L);
        voucher.setBuildingId(5L);
        voucher.setCode("HOBOI10");
        voucher.setStatus(ActiveStatus.ACTIVE);
        voucher.setDiscountType(DiscountType.PERCENT);
        voucher.setDiscountValue(BigDecimal.TEN);
        voucher.setMaxDiscount(BigDecimal.valueOf(50000));
        voucher.setApplyScope(ApplyScope.AMENITY);
        voucher.setValidFrom(DAY.minusDays(5));
        voucher.setValidTo(DAY.plusDays(5));
    }

    private Target amenity(long id, LocalDate day) {
        return new Target(ApplyScope.AMENITY, id, 5L, 9L, day);
    }

    @Test
    void percentDiscountIsRoundedAndCapped() {
        assertThat(VoucherRedemptionService.discount(voucher, BigDecimal.valueOf(123_456))).isEqualByComparingTo("12346");
        assertThat(VoucherRedemptionService.discount(voucher, BigDecimal.valueOf(900_000))).isEqualByComparingTo("50000");
        voucher.setDiscountType(DiscountType.AMOUNT);
        voucher.setDiscountValue(BigDecimal.valueOf(80_000));
        assertThat(VoucherRedemptionService.discount(voucher, BigDecimal.valueOf(60_000))).isEqualByComparingTo("60000");
    }

    @Test
    void checksBuildingValidityScopeTargetsAndLimits() {
        when(vouchers.findByCode("HOBOI10")).thenReturn(Optional.of(voucher));
        BigDecimal fee = BigDecimal.valueOf(40000);

        assertThat(service.preview(" hoboi10 ", amenity(3, DAY), fee).orElseThrow().discount()).isEqualByComparingTo("4000");
        assertThat(service.preview("  ", amenity(3, DAY), fee)).isEmpty();
        assertThatThrownBy(() -> service.preview("HOBOI10", amenity(3, DAY.plusDays(10)), fee))
                .hasMessage("Voucher chỉ có hiệu lực từ 15/10/2026 đến 25/10/2026.");
        assertThatThrownBy(() -> service.preview("HOBOI10", new Target(ApplyScope.SERVICE, 3L, 5L, 9L, DAY), fee))
                .hasMessage("Voucher chỉ áp dụng cho tiện ích.");
        voucher.setAmenityIds(Set.of(7L));
        assertThatThrownBy(() -> service.preview("HOBOI10", amenity(3, DAY), fee)).hasMessage("Voucher không áp dụng cho tiện ích này.");
        voucher.setAmenityIds(Set.of());
        assertThatThrownBy(() -> service.preview("HOBOI10", amenity(3, DAY), BigDecimal.ZERO))
                .hasMessage("Lượt này miễn phí, không cần dùng voucher.");
        voucher.setTotalQuantity(5);
        voucher.setUsedCount(5);
        assertThatThrownBy(() -> service.preview("HOBOI10", amenity(3, DAY), fee)).hasMessage("Voucher đã hết lượt sử dụng.");
        voucher.setUsedCount(1);
        voucher.setPerApartmentLimit(2);
        when(usages.countByVoucherIdAndApartmentId(1L, 9L)).thenReturn(2L);
        assertThatThrownBy(() -> service.preview("HOBOI10", amenity(3, DAY), fee))
                .hasMessage("Căn hộ đã dùng hết 2 lượt của voucher này.");
        assertThatThrownBy(() -> service.preview("HOBOI10", new Target(ApplyScope.AMENITY, 3L, 6L, 9L, DAY), fee))
                .hasMessage("Mã voucher không tồn tại ở tòa nhà này.");
    }
}
