package com.bihome.feenotice;

import static org.assertj.core.api.Assertions.assertThat;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.feenotice.FeeNotice.Item;
import com.bihome.feenotice.FeeNotice.ItemType;
import com.bihome.feerate.FeeRateConfig;
import com.bihome.meter.MeterReading;
import com.bihome.transaction.FinancialTransaction;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class FeeCalculatorTest {

    @Test
    void calculatesTieredMetersParkingVatAndCarriedItems() {
        FeeRateConfig config = new FeeRateConfig();
        config.setVatPercent(new BigDecimal("10"));
        config.setManagementRates(List.of(new FeeRateConfig.ManagementRate(ApartmentType.APARTMENT, new BigDecimal("7000"))));
        config.setElectricTiers(List.of(new FeeRateConfig.Tier(new BigDecimal("50"), new BigDecimal("1806")),
                new FeeRateConfig.Tier(new BigDecimal("100"), new BigDecimal("1866")),
                new FeeRateConfig.Tier(null, new BigDecimal("2167"))));
        config.setWaterTiers(List.of(new FeeRateConfig.Tier(null, new BigDecimal("15000"))));
        config.setParkingRates(List.of(new FeeRateConfig.ParkingRate(7L, new BigDecimal("120000")),
                new FeeRateConfig.ParkingRate(8L, new BigDecimal("1200000"))));
        config.setOtherCharges(List.of(new FeeRateConfig.OtherCharge("Phí vệ sinh", new BigDecimal("30000"))));

        MeterReading electric = reading("2026-09", "1200", "1450", null);
        FinancialTransaction booking = new FinancialTransaction();
        booking.setCode("GD-260901-001");
        booking.setSourceType(FinancialTransaction.SourceType.AMENITY_BOOKING);
        booking.setSourceCode("DK-260901-001");
        booking.setAmount(new BigDecimal("80000"));
        FeeNotice old = new FeeNotice();
        old.setCode("TB-260801-001");
        old.setBillingPeriod("2026-08");
        old.setStatus(FeeNotice.Status.PARTIAL);
        old.setTotalAmount(new BigDecimal("900000"));
        old.setPaidAmount(new BigDecimal("400000"));
        old.setDueDate(LocalDate.of(2026, 9, 15));

        FeeCalculator.Result r = FeeCalculator.calculate(new FeeCalculator.Input("2026-09", ApartmentType.APARTMENT,
                new BigDecimal("75.5"), config, electric, null, Map.of(7L, 2L), Map.of(7L, "Xe máy", 8L, "Ô tô"),
                List.of(booking), List.of(old)));

        assertThat(r.items()).extracting(Item::getType).containsExactly(ItemType.MANAGEMENT, ItemType.ELECTRIC,
                ItemType.ELECTRIC, ItemType.ELECTRIC, ItemType.PARKING, ItemType.OTHER, ItemType.VAT, ItemType.SERVICE,
                ItemType.PREVIOUS_DEBT);
        assertThat(amounts(r.items())).containsExactly(528500L, 90300L, 93300L, 325050L, 240000L, 30000L, 130715L, 80000L,
                500000L);
        // 50 kWh bậc 1, 50 kWh bậc 2, 150 kWh bậc 3.
        assertThat(r.items().get(3).getQuantity()).isEqualByComparingTo("150");
        assertThat(r.items().get(4).getDescription()).isEqualTo("Phí gửi xe – Xe máy");
        assertThat(r.total()).isEqualByComparingTo("2017865");
        assertThat(r.warnings()).containsExactly("Chưa có chỉ số nước của kỳ này.");
    }

    @Test
    void warnsAboutMissingRatesAreaAndSpikes() {
        FeeRateConfig config = new FeeRateConfig();
        config.setElectricTiers(List.of(new FeeRateConfig.Tier(null, new BigDecimal("2000"))));
        MeterReading spike = reading("2026-09", "100", "500", "100");

        FeeCalculator.Result r = FeeCalculator.calculate(new FeeCalculator.Input("2026-09", ApartmentType.VILLA, null,
                config, spike, reading("2026-09", "1", "2", null), Map.of(), Map.of(), List.of(), List.of()));

        assertThat(r.items()).singleElement().satisfies(i -> {
            assertThat(i.getAmount()).isEqualByComparingTo("800000");
            assertThat(i.getDescription()).isEqualTo("Điện (100 → 500)");
        });
        assertThat(r.warnings()).containsExactly("Chưa cấu hình phí quản lý cho loại căn này.",
                "Tiêu thụ điện tăng bất thường (400 kWh, trung bình 100).", "Chưa cấu hình giá nước.");
    }

    @Test
    void vatIsRecomputedAndDiscountsStayLast() {
        List<Item> items = FeeCalculator.withVat(List.of(
                new Item(ItemType.DISCOUNT, "Giảm trừ", null, null, new BigDecimal("-50000"), null),
                new Item(ItemType.VAT, "VAT cũ", null, null, new BigDecimal("1"), null),
                new Item(ItemType.MANAGEMENT, "Phí quản lý", null, null, new BigDecimal("500000"), null)),
                new BigDecimal("8"));
        assertThat(items).extracting(Item::getType).containsExactly(ItemType.MANAGEMENT, ItemType.VAT, ItemType.DISCOUNT);
        assertThat(items.get(1).getAmount()).isEqualByComparingTo("40000");
        assertThat(FeeCalculator.total(items)).isEqualByComparingTo("490000");
    }

    private static MeterReading reading(String period, String oldIndex, String newIndex, String average) {
        MeterReading r = new MeterReading();
        r.setBillingPeriod(period);
        r.setOldIndex(new BigDecimal(oldIndex));
        r.setNewIndex(new BigDecimal(newIndex));
        r.setConsumption(new BigDecimal(newIndex).subtract(new BigDecimal(oldIndex)));
        r.setAverageConsumption(average == null ? null : new BigDecimal(average));
        return r;
    }

    private static List<Long> amounts(List<Item> items) {
        return items.stream().map(i -> i.getAmount().longValueExact()).toList();
    }
}
