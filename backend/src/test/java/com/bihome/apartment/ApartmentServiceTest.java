package com.bihome.apartment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.apartment.ApartmentEnums.ApartmentType;
import com.bihome.apartment.ApartmentEnums.OwnershipType;
import com.bihome.apartment.ApartmentEnums.UsageStatus;
import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.accesscard.AccessCardRepository;
import com.bihome.asset.AssetItemRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.ImageListResolver;
import com.bihome.resident.ApartmentResidentRepository;
import com.bihome.ticket.TicketRepository;
import jakarta.persistence.EntityManager;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ApartmentServiceTest {

    private static final AuthUser ME = new AuthUser(1L, "me", Set.of("BUILDING_MANAGER"), Set.of(), Set.of(5L), false, false);

    @Mock ApartmentRepository apartments;
    @Mock AssetItemRepository assetItems;
    @Mock ApartmentResidentRepository residentLinks;
    @Mock TicketRepository tickets;
    @Mock AccessCardRepository accessCards;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock ImageListResolver imageResolver;
    @Mock ApartmentMapper mapper;
    @Mock Validator validator;
    @Mock EntityManager entityManager;
    @Mock Clock clock;

    @InjectMocks
    ApartmentService service;

    private static ApartmentDtos.Request request(Long buildingId) {
        return new ApartmentDtos.Request(buildingId, " a-12.05 ", " Căn A ", "12a", 2, 4, new BigDecimal("75.50"),
                ApartmentType.APARTMENT, OwnershipType.OWN, UsageStatus.OCCUPIED, " ", ActiveStatus.ACTIVE, List.of(), null);
    }

    @Test
    void createUsesTheSelectedBuildingAndNormalizesFields() {
        when(buildingContext.requireBuildingId()).thenReturn(5L);
        when(apartments.existsByBuildingIdAndCode(5L, "A-12.05")).thenReturn(false);

        service.create(request(null), ME);

        ArgumentCaptor<Apartment> saved = ArgumentCaptor.forClass(Apartment.class);
        verify(apartments).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getBuildingId()).isEqualTo(5L);
        assertThat(saved.getValue().getCode()).isEqualTo("A-12.05");
        assertThat(saved.getValue().getName()).isEqualTo("Căn A");
        assertThat(saved.getValue().getFloorNo()).isEqualTo("12A");
        assertThat(saved.getValue().getDescription()).isNull();
    }

    @Test
    void cannotAddApartmentsToAnInactiveBuilding() {
        when(buildingService.requireActive(eq(7L), anyString()))
                .thenThrow(new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "inactive"));

        assertThatThrownBy(() -> service.create(request(7L), ME))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.BUSINESS_RULE_VIOLATION));
        verify(apartments, never()).saveAndFlush(any());
    }

    @Test
    void duplicateCodeInTheSameBuildingIsAConflictOnTheCodeField() {
        when(apartments.existsByBuildingIdAndCode(5L, "A-12.05")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request(5L), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("code");
                });
    }

    @Test
    void apartmentWithAssetItemsCannotBeDeleted() {
        Apartment apartment = new Apartment();
        apartment.setBuildingId(5L);
        when(apartments.findById(9L)).thenReturn(Optional.of(apartment));
        when(buildingService.canAccess(5L)).thenReturn(true);
        when(assetItems.countByApartmentId(9L)).thenReturn(2L);

        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getMessage()).isEqualTo("Căn hộ còn 2 hạng mục, hãy chuyển sang Không hoạt động.");
                });
        verify(apartments, never()).delete(any(Apartment.class));
    }

    @Test
    void apartmentWithResidentRecordsCannotBeDeleted() {
        Apartment apartment = new Apartment();
        apartment.setBuildingId(5L);
        when(apartments.findById(9L)).thenReturn(Optional.of(apartment));
        when(buildingService.canAccess(5L)).thenReturn(true);
        when(residentLinks.countByApartmentId(9L)).thenReturn(3L);

        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getMessage())
                            .isEqualTo("Căn hộ còn 3 bản ghi cư dân, hãy chuyển sang Không hoạt động.");
                });
        verify(apartments, never()).delete(any(Apartment.class));
    }
}
