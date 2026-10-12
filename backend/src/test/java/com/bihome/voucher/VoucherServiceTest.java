package com.bihome.voucher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.amenity.AmenityRepository;
import com.bihome.building.Building;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.servicecatalog.ServiceOfferingRepository;
import com.bihome.voucher.Voucher.ApplyScope;
import com.bihome.voucher.Voucher.DiscountType;
import com.bihome.voucher.Voucher.Validity;
import com.bihome.voucher.dto.VoucherDtos;
import jakarta.persistence.EntityManager;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoucherServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 11);

    @Mock VoucherRepository vouchers;
    @Mock AmenityRepository amenities;
    @Mock ServiceOfferingRepository services;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock EntityManager entityManager;

    VoucherService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-11T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new VoucherService(vouchers, amenities, services, buildingService, buildingContext, entityManager, clock);
        lenient().when(buildingContext.requireBuildingId()).thenReturn(5L);
        lenient().when(buildingService.canAccess(5L)).thenReturn(true);
    }

    private static VoucherDtos.Request request(DiscountType type, String value, String max, Integer total, Integer perApt) {
        return new VoucherDtos.Request(" hoboi10 ", " Giảm 10% hồ bơi ", null, type, new BigDecimal(value),
                max == null ? null : new BigDecimal(max), ApplyScope.AMENITY, List.of(), List.of(), total, perApt, TODAY, TODAY.plusDays(30),
                ActiveStatus.ACTIVE, 0L);
    }

    private Voucher existing(int usedCount) throws Exception {
        Voucher v = new Voucher();
        v.setId(9L);
        v.setBuildingId(5L);
        v.setCode("HOBOI10");
        v.setName("Giảm 10%");
        v.setDiscountType(DiscountType.PERCENT);
        v.setDiscountValue(new BigDecimal("10"));
        v.setApplyScope(ApplyScope.AMENITY);
        v.setTotalQuantity(100);
        v.setUsedCount(usedCount);
        v.setValidFrom(TODAY);
        v.setValidTo(TODAY.plusDays(30));
        v.setStatus(ActiveStatus.ACTIVE);
        v.setVersion(0L);
        Field building = Voucher.class.getDeclaredField("building");
        building.setAccessible(true);
        building.set(v, new Building());
        when(vouchers.findById(9L)).thenReturn(Optional.of(v));
        return v;
    }

    @Test
    void createNormalizesTheCodeInTheSelectedBuilding() {
        lenient().when(vouchers.saveAndFlush(any())).thenAnswer(inv -> {
            Voucher v = inv.getArgument(0);
            Field building = Voucher.class.getDeclaredField("building");
            building.setAccessible(true);
            building.set(v, new Building());
            return v;
        });
        service.create(request(DiscountType.PERCENT, "10", "50000", 100, 2));

        ArgumentCaptor<Voucher> saved = ArgumentCaptor.forClass(Voucher.class);
        verify(vouchers).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getCode()).isEqualTo("HOBOI10");
        assertThat(saved.getValue().getName()).isEqualTo("Giảm 10% hồ bơi");
        assertThat(saved.getValue().getBuildingId()).isEqualTo(5L);
    }

    @Test
    void percentAndAmountRules() {
        assertThatThrownBy(() -> service.create(request(DiscountType.PERCENT, "120", null, null, null)))
                .hasMessage("Giảm theo % tối đa 100%.");
        assertThatThrownBy(() -> service.create(request(DiscountType.AMOUNT, "20000", "5000", null, null)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("maxDiscount"));
        assertThatThrownBy(() -> service.create(request(DiscountType.AMOUNT, "20000.5", null, null, null)))
                .hasMessage("Số tiền giảm là số nguyên (VND).");
        assertThatThrownBy(() -> service.create(request(DiscountType.PERCENT, "10", null, 5, 10)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("perApartmentLimit"));
        verify(vouchers, never()).saveAndFlush(any());
    }

    @Test
    void usedVouchersKeepTheirValueAndQuantityCannotDropBelowUsage() throws Exception {
        existing(30);

        assertThatThrownBy(() -> service.update(9L, request(DiscountType.PERCENT, "15", null, 100, null)))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("discountValue");
                });
        assertThatThrownBy(() -> service.update(9L, request(DiscountType.PERCENT, "10", null, 20, null)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("totalQuantity"));

        // Đổi tên / hạn dùng vẫn được.
        service.update(9L, request(DiscountType.PERCENT, "10.00", null, 200, null));
    }

    @Test
    void usedVouchersCannotBeDeleted() throws Exception {
        existing(1);
        assertThatThrownBy(() -> service.delete(9L)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void validityAndSoldOut() {
        Voucher v = new Voucher();
        v.setValidFrom(TODAY.plusDays(1));
        v.setValidTo(TODAY.plusDays(5));
        assertThat(v.validity(TODAY)).isEqualTo(Validity.UPCOMING);
        v.setValidFrom(TODAY);
        assertThat(v.validity(TODAY)).isEqualTo(Validity.VALID);
        v.setValidTo(TODAY.minusDays(1));
        assertThat(v.validity(TODAY)).isEqualTo(Validity.EXPIRED);

        v.setTotalQuantity(3);
        v.setUsedCount(3);
        assertThat(v.isSoldOut()).isTrue();
        v.setTotalQuantity(null);
        assertThat(v.isSoldOut()).isFalse();
    }

    @Test
    void targetsMustMatchTheScope() {
        VoucherDtos.Request serviceScopeWithAmenity = new VoucherDtos.Request("X1", "X", null, DiscountType.PERCENT,
                BigDecimal.TEN, null, ApplyScope.SERVICE, List.of(5L), List.of(), null, null, TODAY, TODAY,
                ActiveStatus.ACTIVE, null);
        assertThatThrownBy(() -> service.create(serviceScopeWithAmenity))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("amenityIds"));
    }
}
