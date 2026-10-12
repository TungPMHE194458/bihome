package com.bihome.feerate;

import com.bihome.asset.AssetCategory;
import com.bihome.asset.AssetCategoryRepository;
import com.bihome.building.Building;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.feerate.FeeRateConfig.ManagementRate;
import com.bihome.feerate.FeeRateConfig.OtherCharge;
import com.bihome.feerate.FeeRateConfig.ParkingRate;
import com.bihome.feerate.FeeRateConfig.Tier;
import com.bihome.feerate.dto.FeeRateDtos;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Đơn giá thông báo phí của tòa đang chọn. Tòa chưa lưu cấu hình thì dùng mặc định (không có khoản nào). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeeRateService {

    private final FeeRateConfigRepository configs;
    private final AssetCategoryRepository categories;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;

    public FeeRateDtos.Response get() {
        Building building = buildingService.findAccessible(buildingContext.requireBuildingId());
        return toResponse(building, configs.findById(building.getId()).orElse(null));
    }

    /** Cấu hình dùng để tính phí; chưa có thì trả cấu hình rỗng (không lưu). */
    public FeeRateConfig forBuilding(Long buildingId) {
        return configs.findById(buildingId).orElseGet(() -> {
            FeeRateConfig c = new FeeRateConfig();
            c.setBuildingId(buildingId);
            return c;
        });
    }

    @Transactional
    public FeeRateDtos.Response update(FeeRateDtos.Request req) {
        Building building = buildingService.requireActive(buildingContext.requireBuildingId(),
                "Tòa nhà đã ngừng hoạt động, không sửa được đơn giá.");
        FeeRateConfig config = configs.findById(building.getId()).orElse(null);
        if (config == null ? req.version() != null : !Objects.equals(config.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (config == null) {
            config = new FeeRateConfig();
            config.setBuildingId(building.getId());
        }
        config.setVatPercent(req.vatPercent().setScale(2, RoundingMode.HALF_UP));
        config.setDueDay(req.dueDay());
        config.setManagementRates(managementRates(req.managementRates()));
        config.setElectricTiers(tiers(req.electricTiers(), "electricTiers", "điện"));
        config.setWaterTiers(tiers(req.waterTiers(), "waterTiers", "nước"));
        config.setParkingRates(parkingRates(req.parkingRates(), building.getId()));
        config.setOtherCharges(nullToEmpty(req.otherCharges()).stream()
                .map(o -> new OtherCharge(o.name().trim(), o.amount().setScale(0, RoundingMode.HALF_UP))).toList());
        config = configs.saveAndFlush(config);
        return toResponse(building, config);
    }

    private static List<ManagementRate> managementRates(List<FeeRateDtos.ManagementRate> rows) {
        Set<Object> seen = new HashSet<>();
        List<ManagementRate> result = new ArrayList<>();
        for (FeeRateDtos.ManagementRate r : nullToEmpty(rows)) {
            if (!seen.add(r.apartmentType())) {
                throw invalid("managementRates", "Mỗi loại căn chỉ khai báo một đơn giá phí quản lý.");
            }
            result.add(new ManagementRate(r.apartmentType(), r.unitPrice()));
        }
        return result;
    }

    /** Mốc tăng dần, chỉ bậc cuối để trống (áp cho phần còn lại). */
    static List<Tier> tiers(List<FeeRateDtos.Tier> rows, String field, String label) {
        List<FeeRateDtos.Tier> list = nullToEmpty(rows);
        BigDecimal previous = BigDecimal.ZERO;
        for (int i = 0; i < list.size(); i++) {
            BigDecimal upTo = list.get(i).upTo();
            boolean last = i == list.size() - 1;
            if (last && upTo != null) {
                throw invalid(field, "Bậc cuối của giá " + label + " để trống mốc (áp dụng cho phần còn lại).");
            }
            if (!last && upTo == null) {
                throw invalid(field, "Bậc " + (i + 1) + " của giá " + label + " cần mốc tiêu thụ.");
            }
            if (upTo != null && upTo.compareTo(previous) <= 0) {
                throw invalid(field, "Mốc các bậc giá " + label + " phải tăng dần.");
            }
            previous = upTo == null ? previous : upTo;
        }
        return list.stream().map(t -> new Tier(t.upTo(), t.unitPrice())).toList();
    }

    private List<ParkingRate> parkingRates(List<FeeRateDtos.ParkingRate> rows, Long buildingId) {
        List<FeeRateDtos.ParkingRate> list = nullToEmpty(rows);
        Set<Long> ids = list.stream().map(FeeRateDtos.ParkingRate::assetCategoryId).collect(Collectors.toSet());
        if (ids.size() != list.size()) {
            throw invalid("parkingRates", "Mỗi danh mục xe chỉ khai báo một đơn giá.");
        }
        Map<Long, AssetCategory> found = categories.findAllById(ids).stream()
                .collect(Collectors.toMap(AssetCategory::getId, Function.identity()));
        for (Long id : ids) {
            AssetCategory c = found.get(id);
            if (c == null || !c.getBuildingId().equals(buildingId)) {
                throw invalid("parkingRates", "Danh mục tài sản không thuộc tòa nhà đang chọn.");
            }
        }
        return list.stream().map(p -> new ParkingRate(p.assetCategoryId(), p.unitPrice())).toList();
    }

    private FeeRateDtos.Response toResponse(Building building, FeeRateConfig c) {
        List<FeeRateDtos.Category> cats = categories.findByBuildingIdAndStatusOrderByNameAsc(building.getId(),
                ActiveStatus.ACTIVE).stream().map(x -> new FeeRateDtos.Category(x.getId(), x.getName(), x.getUnit(),
                x.getStatus())).toList();
        if (c == null) {
            return new FeeRateDtos.Response(building.getId(), building.getName(), BigDecimal.ZERO, 15, List.of(),
                    List.of(), List.of(), List.of(), List.of(), cats, null);
        }
        return new FeeRateDtos.Response(building.getId(), building.getName(), c.getVatPercent(), c.getDueDay(),
                c.getManagementRates().stream().map(r -> new FeeRateDtos.ManagementRate(r.getApartmentType(),
                        r.getUnitPrice())).toList(),
                c.getElectricTiers().stream().map(t -> new FeeRateDtos.Tier(t.getUpTo(), t.getUnitPrice())).toList(),
                c.getWaterTiers().stream().map(t -> new FeeRateDtos.Tier(t.getUpTo(), t.getUnitPrice())).toList(),
                c.getParkingRates().stream().map(p -> new FeeRateDtos.ParkingRate(p.getAssetCategoryId(),
                        p.getUnitPrice())).toList(),
                c.getOtherCharges().stream().map(o -> new FeeRateDtos.OtherCharge(o.getName(), o.getAmount())).toList(),
                cats, c.getVersion());
    }

    private static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static BusinessException invalid(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }
}
