package com.bihome.asset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.accesscard.AccessCardRepository;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.asset.dto.AssetDtos;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AssetItemServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 11);

    @Mock AssetItemRepository items;
    @Mock AssetCategoryRepository categories;
    @Mock ApartmentService apartmentService;
    @Mock BuildingService buildingService;
    @Mock AssetMapper mapper;
    @Mock AccessCardRepository accessCards;
    @Mock EntityManager entityManager;

    AssetItemService service;
    Apartment apartment;
    AssetCategory category;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-11T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new AssetItemService(items, categories, apartmentService, buildingService, mapper, accessCards,
                entityManager, clock);
        apartment = new Apartment();
        apartment.setId(10L);
        apartment.setBuildingId(5L);
        category = new AssetCategory();
        category.setId(20L);
        category.setBuildingId(5L);
        category.setUnit("chiếc");
        category.setStatus(ActiveStatus.ACTIVE);
        lenient().when(apartmentService.requireAccessible(10L)).thenReturn(apartment);
    }

    private static AssetDtos.ItemRequest request(String plate, LocalDate exitDate) {
        return new AssetDtos.ItemRequest(10L, 20L, " Honda Vision ", plate, null, " ", TODAY.minusDays(30), exitDate,
                ActiveStatus.ACTIVE, null);
    }

    private AssetItem saved() {
        ArgumentCaptor<AssetItem> captor = ArgumentCaptor.forClass(AssetItem.class);
        verify(items).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    @Test
    void normalizesPlateAndTakesUnitFromCategory() {
        when(categories.findById(20L)).thenReturn(Optional.of(category));

        service.create(request("  29b1   678.90 ", null));

        AssetItem item = saved();
        assertThat(item.getPlateNumber()).isEqualTo("29B1 678.90");
        assertThat(item.getUnit()).isEqualTo("chiếc");
        assertThat(item.getName()).isEqualTo("Honda Vision");
        assertThat(item.getBuildingId()).isEqualTo(5L);
        assertThat(item.getStatus()).isEqualTo(ActiveStatus.ACTIVE);
    }

    @Test
    void exitDateUpToTodayMakesTheItemInactiveAndSkipsThePlateCheck() {
        when(categories.findById(20L)).thenReturn(Optional.of(category));

        service.create(request("30A-123.45", TODAY));

        assertThat(saved().getStatus()).isEqualTo(ActiveStatus.INACTIVE);
        verify(items, never()).existsActivePlate(any(), any(), any(), any());
    }

    @Test
    void futureExitDateKeepsTheItemActive() {
        when(categories.findById(20L)).thenReturn(Optional.of(category));

        service.create(request(null, TODAY.plusDays(1)));

        assertThat(saved().getStatus()).isEqualTo(ActiveStatus.ACTIVE);
    }

    @Test
    void duplicateActivePlateInTheBuildingIsAConflict() {
        when(categories.findById(20L)).thenReturn(Optional.of(category));
        when(items.existsActivePlate(eq(5L), eq("30A-123.45"), eq(ActiveStatus.ACTIVE), isNull())).thenReturn(true);

        assertThatThrownBy(() -> service.create(request("30a-123.45", null)))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("plateNumber");
                });
    }

    @Test
    void exitDateBeforeEntryDateIsRejected() {
        when(categories.findById(20L)).thenReturn(Optional.of(category));
        AssetDtos.ItemRequest req = new AssetDtos.ItemRequest(10L, 20L, "Xe", null, null, null, TODAY, TODAY.minusDays(1),
                ActiveStatus.ACTIVE, null);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("exitDate"));
    }

    @Test
    void categoryMustBelongToTheApartmentsBuildingAndBeActive() {
        AssetCategory foreign = new AssetCategory();
        foreign.setId(20L);
        foreign.setBuildingId(99L);
        when(categories.findById(20L)).thenReturn(Optional.of(foreign));
        assertThatThrownBy(() -> service.create(request(null, null)))
                .hasMessage("Danh mục không thuộc tòa nhà của căn hộ.");

        category.setStatus(ActiveStatus.INACTIVE);
        when(categories.findById(20L)).thenReturn(Optional.of(category));
        assertThatThrownBy(() -> service.create(request(null, null)))
                .hasMessage("Danh mục đang ngừng hoạt động.");
    }

    @Test
    void itemsThatAlreadyLeftCannotBeReactivated() {
        AssetItem item = new AssetItem();
        item.setBuildingId(5L);
        item.setExitDate(TODAY.minusDays(3));
        item.setStatus(ActiveStatus.INACTIVE);
        when(items.findById(7L)).thenReturn(Optional.of(item));
        when(buildingService.canAccess(5L)).thenReturn(true);

        assertThatThrownBy(() -> service.changeStatus(7L, ActiveStatus.ACTIVE))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.BUSINESS_RULE_VIOLATION));
        verify(buildingService, never()).requireActive(any(), anyString());
    }
}
