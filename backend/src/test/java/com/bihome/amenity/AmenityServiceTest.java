package com.bihome.amenity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.bihome.amenity.AmenityConfig.DayType;
import com.bihome.amenity.AmenityConfig.PriceUnit;
import com.bihome.amenity.dto.AmenityDtos;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FileService;
import com.bihome.common.storage.ImageListResolver;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AmenityServiceTest {

    @Mock AmenityRepository amenities;
    @Mock AmenityConfigRepository configs;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock ImageListResolver imageResolver;
    @Mock FileService fileService;
    @Mock EntityManager entityManager;

    @InjectMocks
    AmenityService service;

    AmenityConfig config;

    @BeforeEach
    void setUp() {
        Amenity pool = new Amenity();
        pool.setId(1L);
        pool.setBuildingId(5L);
        pool.setCapacity(20);
        pool.setOpenTime(LocalTime.of(6, 0));
        pool.setCloseTime(LocalTime.of(21, 0));
        pool.setVersion(0L);
        config = new AmenityConfig();
        config.setAmenityId(1L);
        config.setVersion(0L);
        lenient().when(amenities.findById(1L)).thenReturn(Optional.of(pool));
        lenient().when(buildingService.canAccess(5L)).thenReturn(true);
        lenient().when(configs.findById(1L)).thenReturn(Optional.of(config));
    }

    private static AmenityDtos.SlotDto slot(int day, String start, String end, Integer capacity) {
        return new AmenityDtos.SlotDto(day, LocalTime.parse(start), LocalTime.parse(end), capacity);
    }

    private static AmenityDtos.PriceDto price(DayType type, String start, String end, int value) {
        return new AmenityDtos.PriceDto(type, LocalTime.parse(start), LocalTime.parse(end), BigDecimal.valueOf(value),
                PriceUnit.PER_BOOKING);
    }

    private static AmenityDtos.ConfigRequest config(List<AmenityDtos.SlotDto> slots, List<AmenityDtos.PriceDto> prices,
                                                    List<AmenityDtos.MaintenanceDto> maintenances) {
        return new AmenityDtos.ConfigRequest(60, 3, 7, 2, slots, prices, maintenances, 0L);
    }

    @Test
    void savesSortedSlotsPricesAndMaintenance() {
        service.updateConfig(1L, config(
                List.of(slot(6, "18:00", "19:00", null), slot(1, "06:00", "07:00", 10), slot(1, "07:00", "08:00", null)),
                List.of(price(DayType.WEEKEND, "17:00", "21:00", 50000)),
                List.of(new AmenityDtos.MaintenanceDto(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2), " Thay nước "))));

        assertThat(config.getSlots()).extracting(s -> s.getDayOfWeek() + " " + s.getStartTime())
                .containsExactly("1 06:00", "1 07:00", "6 18:00");
        assertThat(config.getMaxBookingsPerWeek()).isEqualTo(3);
        assertThat(config.getMaintenances().getFirst().getReason()).isEqualTo("Thay nước");
    }

    @Test
    void slotsMustNotOverlapOrLeaveOpeningHours() {
        assertThatThrownBy(() -> service.updateConfig(1L,
                config(List.of(slot(1, "06:00", "07:30", null), slot(1, "07:00", "08:00", null)), null, null)))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("slots");
                    assertThat(e.getMessage()).isEqualTo("Thứ 2: khung 06:00–07:30 và 07:00–08:00 bị chồng nhau.");
                });
        assertThatThrownBy(() -> service.updateConfig(1L, config(List.of(slot(7, "20:30", "21:30", null)), null, null)))
                .hasMessage("Chủ nhật 20:30–21:30 nằm ngoài giờ mở cửa 06:00–21:00.");
        assertThatThrownBy(() -> service.updateConfig(1L, config(List.of(slot(2, "08:00", "09:00", 50)), null, null)))
                .hasMessageContaining("không được lớn hơn sức chứa tiện ích (20)");
    }

    @Test
    void pricesMustNotOverlapWithinADayTypeButMayAcrossTypes() {
        service.updateConfig(1L, config(List.of(),
                List.of(price(DayType.WEEKDAY, "17:00", "21:00", 30000), price(DayType.WEEKEND, "17:00", "21:00", 50000)),
                null));
        assertThat(config.getPrices()).hasSize(2);

        config.setVersion(0L);
        assertThatThrownBy(() -> service.updateConfig(1L, config(List.of(),
                List.of(price(DayType.WEEKEND, "08:00", "12:00", 1), price(DayType.WEEKEND, "11:00", "13:00", 2)), null)))
                .hasMessage("Cuối tuần: mức giá 08:00–12:00 và 11:00–13:00 bị chồng nhau.");
    }

    @Test
    void maintenancePeriodsMustNotOverlap() {
        assertThatThrownBy(() -> service.updateConfig(1L, config(List.of(), List.of(), List.of(
                new AmenityDtos.MaintenanceDto(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5), null),
                new AmenityDtos.MaintenanceDto(LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 6), null)))))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("maintenances"));
    }

    @Test
    void shrinkingOpeningHoursCannotOrphanConfiguredSlots() {
        config.getSlots().add(new AmenityConfig.Slot(1, LocalTime.of(6, 0), LocalTime.of(7, 0), null));
        AmenityDtos.Request req = new AmenityDtos.Request("POOL", "Hồ bơi", null, 20, LocalTime.of(8, 0), LocalTime.of(21, 0),
                null, false, ActiveStatus.ACTIVE, List.of(), 0L);
        when(amenities.existsByCodeAndIdNot("POOL", 1L)).thenReturn(false);

        assertThatThrownBy(() -> service.update(1L, req, null)).hasMessageContaining("nằm ngoài giờ mở cửa 08:00–21:00");
    }

    @Test
    void priceLookupUsesTheDayTypeAndStartTime() {
        config.getPrices().add(new AmenityConfig.Price(DayType.WEEKEND, LocalTime.of(17, 0), LocalTime.of(21, 0),
                BigDecimal.valueOf(50000), PriceUnit.PER_BOOKING));
        LocalDate saturday = LocalDate.of(2026, 10, 10);
        LocalDate monday = LocalDate.of(2026, 10, 12);

        assertThat(config.priceFor(saturday, LocalTime.of(18, 0))).isPresent();
        assertThat(config.priceFor(saturday, LocalTime.of(21, 0))).isEmpty();
        assertThat(config.priceFor(monday, LocalTime.of(18, 0))).isEmpty();

        config.getMaintenances().add(new AmenityConfig.Maintenance(monday, monday.plusDays(1), null));
        assertThat(config.isUnderMaintenance(monday.plusDays(1))).isTrue();
        assertThat(config.isUnderMaintenance(monday.plusDays(2))).isFalse();
    }
}
