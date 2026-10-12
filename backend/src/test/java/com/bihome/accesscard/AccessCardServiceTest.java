package com.bihome.accesscard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.accesscard.AccessCardEnums.CardType;
import com.bihome.accesscard.AccessCardEnums.HistoryAction;
import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.asset.AssetItem;
import com.bihome.asset.AssetItemRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.resident.ApartmentResident;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import com.bihome.transaction.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccessCardServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 11);

    @Mock AccessCardRepository cards;
    @Mock ApartmentService apartmentService;
    @Mock ResidentRepository residents;
    @Mock AssetItemRepository assetItems;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock AccessCardMapper mapper;
    @Mock EntityManager entityManager;

    @Mock TransactionService transactionService;

    AccessCardService service;
    Apartment apartment;
    AccessCard card;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-11T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new AccessCardService(cards, apartmentService, transactionService, residents, assetItems, buildingService, buildingContext,
                mapper, entityManager, clock);
        apartment = new Apartment();
        apartment.setId(10L);
        apartment.setBuildingId(5L);
        apartment.setCode("A0101");
        apartment.setName("A-01.01");
        apartment.setStatus(ActiveStatus.ACTIVE);
        lenient().when(apartmentService.requireAccessible(10L)).thenReturn(apartment);
        lenient().when(buildingContext.requireBuildingId()).thenReturn(5L);
        lenient().when(buildingService.canAccess(5L)).thenReturn(true);
        lenient().when(cards.saveAndFlush(any(AccessCard.class))).thenAnswer(inv -> {
            AccessCard c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId(1L);
                card = c;
            }
            return c;
        });
        lenient().when(cards.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(card));
    }

    private static AccessCardDtos.Request request(Long apartmentId, Long residentId, Long itemId, CardType type) {
        return new AccessCardDtos.Request(" ab 12-34 ", type, apartmentId, residentId, itemId, null, null,
                BigDecimal.valueOf(50000), null, null);
    }

    private AccessCard existing(CardStatus status) {
        card = new AccessCard();
        card.setId(9L);
        card.setBuildingId(5L);
        card.setCardNo("C1");
        card.setCardType(CardType.MULTI);
        card.setStatus(status);
        card.setVersion(1L);
        if (CardStatus.ASSIGNED.contains(status) || status == CardStatus.LOST) {
            card.setApartmentId(10L);
            card.setResidentId(3L);
        }
        return card;
    }

    private Resident livingIn(long residentId, long apartmentId) {
        Resident r = new Resident();
        r.setId(residentId);
        r.setBuildingId(5L);
        ApartmentResident link = new ApartmentResident();
        link.setApartmentId(apartmentId);
        link.setResidenceStatus(ResidenceStatus.LIVING);
        r.getApartments().add(link);
        return r;
    }

    @Test
    void cardWithoutApartmentGoesToStockAndCardNumbersAreNormalized() {
        service.create(request(null, null, null, CardType.ELEVATOR));

        assertThat(card.getCardNo()).isEqualTo("AB12-34");
        assertThat(card.getStatus()).isEqualTo(CardStatus.IN_STOCK);
        assertThat(card.getHistory()).singleElement().satisfies(h -> assertThat(h.getAction()).isEqualTo(HistoryAction.CREATED));
    }

    @Test
    void cardWithApartmentIsIssuedTodayToALivingResident() {
        when(residents.findById(3L)).thenReturn(Optional.of(livingIn(3L, 10L)));

        service.create(request(10L, 3L, null, CardType.DOOR));

        assertThat(card.getStatus()).isEqualTo(CardStatus.IN_USE);
        assertThat(card.getIssuedDate()).isEqualTo(TODAY);
        assertThat(card.getResidentId()).isEqualTo(3L);
        assertThat(card.getHistory()).singleElement().satisfies(h -> assertThat(h.getAction()).isEqualTo(HistoryAction.ISSUED));
    }

    @Test
    void residentMustLiveInTheApartment() {
        when(residents.findById(3L)).thenReturn(Optional.of(livingIn(3L, 99L)));

        assertThatThrownBy(() -> service.create(request(10L, 3L, null, CardType.DOOR)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("residentId"));
    }

    @Test
    void onlyParkingOrMultiCardsLinkVehiclesAndAVehicleHasOneActiveCard() {
        assertThatThrownBy(() -> service.create(request(10L, null, 7L, CardType.ELEVATOR)))
                .hasMessage("Chỉ thẻ Gửi xe hoặc Đa năng mới liên kết được với xe.");

        AssetItem item = new AssetItem();
        item.setId(7L);
        item.setApartmentId(10L);
        item.setStatus(ActiveStatus.ACTIVE);
        when(assetItems.findById(7L)).thenReturn(Optional.of(item));
        when(cards.existsActiveForItem(any(), any(), any())).thenReturn(true);
        assertThatThrownBy(() -> service.create(request(10L, null, 7L, CardType.PARKING)))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("assetItemId");
                });
    }

    @Test
    void cardsInStockMustBeIssuedBeforeUse() {
        existing(CardStatus.IN_STOCK);

        assertThatThrownBy(() -> service.changeStatus(9L, new AccessCardDtos.StatusRequest(CardStatus.IN_USE, null, 1L)))
                .hasMessage("Thẻ trong kho cần Cấp thẻ cho căn hộ trước khi dùng.");
    }

    @Test
    void invalidTransitionIsRejected() {
        existing(CardStatus.REVOKED);

        assertThatThrownBy(() -> service.changeStatus(9L, new AccessCardDtos.StatusRequest(CardStatus.LOCKED, null, 1L)))
                .hasMessage("Không thể chuyển thẻ từ \"Thu hồi\" sang \"Khoá\".");
    }

    @Test
    void revokingClearsTheAssignmentAndKeepsItInHistory() {
        existing(CardStatus.IN_USE);
        Resident r = livingIn(3L, 10L);
        r.setFullName("Nguyễn Văn An");
        when(entityManager.find(Apartment.class, 10L)).thenReturn(apartment);
        when(entityManager.find(Resident.class, 3L)).thenReturn(r);

        service.changeStatus(9L, new AccessCardDtos.StatusRequest(CardStatus.REVOKED, "Trả thẻ", 1L));

        assertThat(card.getStatus()).isEqualTo(CardStatus.REVOKED);
        assertThat(card.getApartmentId()).isNull();
        assertThat(card.getResidentId()).isNull();
        assertThat(card.getHistory()).singleElement().satisfies(h -> {
            assertThat(h.getFromStatus()).isEqualTo(CardStatus.IN_USE);
            assertThat(h.getApartmentLabel()).isEqualTo("A0101 – A-01.01");
            assertThat(h.getResidentName()).isEqualTo("Nguyễn Văn An");
            assertThat(h.getNote()).isEqualTo("Trả thẻ");
        });
    }

    @Test
    void lostCardsKeepWhoLostThem() {
        existing(CardStatus.IN_USE);

        service.changeStatus(9L, new AccessCardDtos.StatusRequest(CardStatus.LOST, null, 1L));

        assertThat(card.getStatus()).isEqualTo(CardStatus.LOST);
        assertThat(card.getResidentId()).isEqualTo(3L);
    }

    @Test
    void movingOutRevokesTheResidentsCardsAtThoseApartments() {
        AccessCard assigned = existing(CardStatus.LOCKED);
        when(cards.findAssignedTo(3L, List.of(10L), CardStatus.ASSIGNED)).thenReturn(List.of(assigned));

        assertThat(service.revokeForResident(3L, List.of(10L))).isEqualTo(1);
        assertThat(assigned.getStatus()).isEqualTo(CardStatus.REVOKED);
        assertThat(assigned.getHistory().getFirst().getNote()).isEqualTo("Thu hồi khi cư dân chuyển đi");
    }

    @Test
    void onlyNeverIssuedStockCardsCanBeDeleted() {
        existing(CardStatus.REVOKED);
        assertThatThrownBy(() -> service.delete(9L)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void stateMachine() {
        assertThat(CardStatus.IN_STOCK.next()).containsExactlyInAnyOrder(CardStatus.IN_USE, CardStatus.LOST);
        assertThat(CardStatus.LOCKED.canMoveTo(CardStatus.IN_USE)).isTrue();
        assertThat(CardStatus.REVOKED.next()).containsExactly(CardStatus.IN_STOCK);
        assertThat(CardType.ELEVATOR.allowsVehicle()).isFalse();
    }
}
