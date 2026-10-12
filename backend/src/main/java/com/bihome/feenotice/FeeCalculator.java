package com.bihome.feenotice;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.common.util.BillingPeriods;
import com.bihome.feenotice.FeeNotice.Item;
import com.bihome.feenotice.FeeNotice.ItemType;
import com.bihome.feerate.FeeRateConfig;
import com.bihome.meter.MeterReading;
import com.bihome.transaction.FinancialTransaction;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Tính các khoản của thông báo phí (không truy cập DB). Mỗi dòng có {@code số lượng × đơn giá = thành tiền} khi tính
 * được; tiền làm tròn đến đồng. Điện / nước bậc thang tách mỗi bậc một dòng để cư dân đối chiếu.
 */
public final class FeeCalculator {

    private FeeCalculator() {
    }

    /**
     * @param area            diện tích căn (m²), null = chưa khai báo
     * @param parking         số xe đang hoạt động theo danh mục tài sản
     * @param categoryNames   tên danh mục tài sản (id → tên)
     * @param unbilled        giao dịch tiện ích / dịch vụ chưa thanh toán, chưa vào thông báo nào
     * @param unpaid          thông báo phí kỳ trước còn nợ
     */
    public record Input(
            String period,
            ApartmentType apartmentType,
            BigDecimal area,
            FeeRateConfig config,
            MeterReading electric,
            MeterReading water,
            Map<Long, Long> parking,
            Map<Long, String> categoryNames,
            List<FinancialTransaction> unbilled,
            List<FeeNotice> unpaid) {
    }

    public record Result(List<Item> items, List<String> warnings, BigDecimal total) {
    }

    public static Result calculate(Input in) {
        List<Item> items = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        FeeRateConfig c = in.config();
        String periodLabel = BillingPeriods.label(in.period());

        // Phí quản lý = diện tích × đơn giá theo loại căn.
        c.getManagementRates().stream().filter(r -> r.getApartmentType() == in.apartmentType()).findFirst().ifPresentOrElse(
                rate -> {
                    if (in.area() == null || in.area().signum() <= 0) {
                        warnings.add("Căn chưa khai báo diện tích, chưa tính phí quản lý.");
                    } else if (rate.getUnitPrice().signum() > 0) {
                        items.add(line(ItemType.MANAGEMENT, "Phí quản lý tháng " + periodLabel + " (" + number(in.area())
                                + " m²)", in.area(), rate.getUnitPrice(), null));
                    }
                },
                () -> warnings.add("Chưa cấu hình phí quản lý cho loại căn này."));

        meter(items, warnings, ItemType.ELECTRIC, "Điện", "kWh", in.electric(), c.getElectricTiers());
        meter(items, warnings, ItemType.WATER, "Nước", "m³", in.water(), c.getWaterTiers());

        for (FeeRateConfig.ParkingRate rate : c.getParkingRates()) {
            long count = in.parking().getOrDefault(rate.getAssetCategoryId(), 0L);
            if (count > 0 && rate.getUnitPrice().signum() > 0) {
                String name = in.categoryNames().getOrDefault(rate.getAssetCategoryId(), "xe");
                items.add(line(ItemType.PARKING, "Phí gửi xe – " + name, BigDecimal.valueOf(count), rate.getUnitPrice(),
                        null));
            }
        }
        for (FeeRateConfig.OtherCharge other : c.getOtherCharges()) {
            if (other.getAmount().signum() > 0) {
                items.add(line(ItemType.OTHER, other.getName(), BigDecimal.ONE, other.getAmount(), null));
            }
        }
        for (FinancialTransaction t : in.unbilled()) {
            String what = switch (t.getSourceType()) {
                case AMENITY_BOOKING -> "Tiện ích";
                case SERVICE_ORDER -> "Dịch vụ";
                case ACCESS_CARD -> "Thẻ từ";
                case FEE_NOTICE -> "Phí";
            };
            String desc = what + " " + t.getSourceCode() + (t.getDescription() == null ? "" : ": " + t.getDescription());
            items.add(new Item(ItemType.SERVICE, truncate(desc), null, null, money(t.getAmount()), t.getCode()));
        }
        for (FeeNotice n : in.unpaid()) {
            items.add(new Item(ItemType.PREVIOUS_DEBT, "Nợ kỳ " + BillingPeriods.label(n.getBillingPeriod()) + " ("
                    + n.getCode() + ")", null, null, n.outstanding(), n.getCode()));
        }
        List<Item> result = withVat(items, c.getVatPercent());
        return new Result(result, warnings, total(result));
    }

    /** Một dòng mỗi bậc; thiếu số liệu hoặc chưa cấu hình giá thì chỉ cảnh báo. */
    static void meter(List<Item> items, List<String> warnings, ItemType type, String name, String unit,
                      MeterReading reading, List<FeeRateConfig.Tier> tiers) {
        if (reading == null) {
            if (!tiers.isEmpty()) {
                warnings.add("Chưa có chỉ số " + name.toLowerCase() + " của kỳ này.");
            }
            return;
        }
        if (tiers.isEmpty()) {
            warnings.add("Chưa cấu hình giá " + name.toLowerCase() + ".");
            return;
        }
        if (reading.isSpike()) {
            warnings.add("Tiêu thụ " + name.toLowerCase() + " tăng bất thường (" + number(reading.getConsumption())
                    + " " + unit + ", trung bình " + number(reading.getAverageConsumption()) + ").");
        }
        BigDecimal consumption = reading.getConsumption();
        if (consumption.signum() == 0) {
            return;
        }
        String range = " (" + number(reading.getOldIndex()) + " → " + number(reading.getNewIndex()) + ")";
        BigDecimal lower = BigDecimal.ZERO;
        for (int i = 0; i < tiers.size() && consumption.compareTo(lower) > 0; i++) {
            FeeRateConfig.Tier tier = tiers.get(i);
            BigDecimal upper = tier.getUpTo() == null ? consumption : tier.getUpTo().min(consumption);
            BigDecimal qty = upper.subtract(lower);
            if (qty.signum() > 0) {
                String label = tiers.size() == 1 ? name + range
                        : name + " bậc " + (i + 1) + " (" + number(lower) + "–" + (tier.getUpTo() == null ? "" : number(tier.getUpTo()))
                        + " " + unit + ")" + (i == 0 ? range : "");
                items.add(line(type, label, qty, tier.getUnitPrice(), reading.getBillingPeriod()));
            }
            lower = tier.getUpTo() == null ? consumption : tier.getUpTo();
        }
    }

    /**
     * Bỏ dòng VAT cũ, thêm VAT mới tính trên các khoản chịu thuế; sắp các dòng theo nhóm (giữ thứ tự trong nhóm).
     */
    public static List<Item> withVat(List<Item> items, BigDecimal vatPercent) {
        List<Item> result = new ArrayList<>(items.stream().filter(i -> i.getType() != ItemType.VAT).toList());
        BigDecimal base = result.stream().filter(i -> FeeNotice.TAXABLE.contains(i.getType())).map(Item::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (vatPercent != null && vatPercent.signum() > 0 && base.signum() > 0) {
            BigDecimal vat = money(base.multiply(vatPercent).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            result.add(new Item(ItemType.VAT, "VAT " + number(vatPercent) + "% trên " + number(base) + " đ", null, null,
                    vat, null));
        }
        result.sort(Comparator.comparing(Item::getType));
        return result;
    }

    public static BigDecimal total(List<Item> items) {
        return items.stream().map(Item::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    static Item line(ItemType type, String description, BigDecimal qty, BigDecimal unitPrice, String sourceRef) {
        return new Item(type, truncate(description), qty, unitPrice, money(qty.multiply(unitPrice)), sourceRef);
    }

    public static BigDecimal money(BigDecimal v) {
        return v.setScale(0, RoundingMode.HALF_UP);
    }

    /** Số kiểu Việt Nam: 1.450,5. */
    public static String number(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        return new DecimalFormat("#,##0.##", symbols).format(v);
    }

    private static String truncate(String s) {
        return s.length() > 300 ? s.substring(0, 299) + "…" : s;
    }
}
