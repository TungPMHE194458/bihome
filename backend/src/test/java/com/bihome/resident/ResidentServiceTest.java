package com.bihome.resident;

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
import com.bihome.accesscard.AccessCardService;
import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentRepository;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FileAttachmentRepository;
import com.bihome.resident.ResidentEnums.IdDocumentType;
import com.bihome.resident.ResidentEnums.Relationship;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.resident.dto.ResidentDtos;
import com.bihome.ticket.TicketRepository;
import jakarta.persistence.EntityManager;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import com.bihome.booking.AmenityBookingRepository;
import com.bihome.servicecatalog.ServiceOrderRepository;
import com.bihome.survey.SurveyResponseRepository;
import com.bihome.transaction.FinancialTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ResidentServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 11);
    private static final AuthUser ME = new AuthUser(1L, "me", Set.of("BUILDING_MANAGER"), Set.of(), Set.of(5L), false, false);

    @Mock ResidentRepository residents;
    @Mock ApartmentResidentRepository links;
    @Mock TicketRepository tickets;
    @Mock AccessCardService accessCardService;
    @Mock AccessCardRepository accessCards;
    @Mock ApartmentService apartmentService;
    @Mock ApartmentRepository apartments;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock FileAttachmentRepository files;
    @Mock ResidentMapper mapper;
    @Mock Validator validator;
    @Mock EntityManager entityManager;

    @Mock AmenityBookingRepository bookings;
    @Mock ServiceOrderRepository serviceOrders;
    @Mock FinancialTransactionRepository transactions;
    @Mock SurveyResponseRepository surveyResponses;

    ResidentService service;
    Apartment apartment;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-11T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new ResidentService(residents, links, tickets, accessCardService, accessCards, bookings, serviceOrders,
                transactions, surveyResponses, apartmentService, apartments, buildingService, buildingContext,
                files, mapper, validator, entityManager, clock);
        apartment = new Apartment();
        apartment.setId(10L);
        apartment.setBuildingId(5L);
        apartment.setCode("A0101");
        apartment.setStatus(ActiveStatus.ACTIVE);
        lenient().when(apartmentService.requireAccessible(10L)).thenReturn(apartment);
        lenient().when(buildingService.canAccess(5L)).thenReturn(true);
    }

    private static ResidentDtos.LinkRequest link(ResidentRole role, boolean head, LocalDate moveOut) {
        return new ResidentDtos.LinkRequest(10L, role, null, head, TODAY.minusYears(1), moveOut, null, true, null);
    }

    private static ResidentDtos.Request request(String code, String idNumber, ResidentDtos.LinkRequest link) {
        return new ResidentDtos.Request(code, " Nguyễn Văn An ", "+84912345678", " ", null, null,
                idNumber == null ? null : IdDocumentType.CCCD, idNumber, null, null, " ", null, null, link, null);
    }

    private Resident saved() {
        ArgumentCaptor<Resident> captor = ArgumentCaptor.forClass(Resident.class);
        verify(residents).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private Resident existing(ApartmentResident... activeLinks) {
        Resident resident = new Resident();
        resident.setId(1L);
        resident.setBuildingId(5L);
        for (ApartmentResident l : activeLinks) {
            l.setResident(resident);
            resident.getApartments().add(l);
        }
        when(residents.findById(1L)).thenReturn(Optional.of(resident));
        return resident;
    }

    private static ApartmentResident activeLink(long id, long apartmentId, boolean head) {
        ApartmentResident l = new ApartmentResident();
        l.setId(id);
        l.setApartmentId(apartmentId);
        l.setRole(ResidentRole.OWNER);
        l.setHouseholdHead(head);
        l.setMoveInDate(TODAY.minusYears(2));
        l.setResidenceStatus(ResidenceStatus.LIVING);
        return l;
    }

    @Test
    void createGeneratesTheNextCodeNormalizesFieldsAndAddsALivingLink() {
        when(residents.findMaxGeneratedCode(5L)).thenReturn("CD000007");

        service.create(request("", "001085012345", link(ResidentRole.OWNER, false, null)), ME);

        Resident resident = saved();
        assertThat(resident.getCode()).isEqualTo("CD000008");
        assertThat(resident.getBuildingId()).isEqualTo(5L);
        assertThat(resident.getFullName()).isEqualTo("Nguyễn Văn An");
        assertThat(resident.getPhone()).isEqualTo("0912345678");
        assertThat(resident.getEmail()).isNull();
        assertThat(resident.getNationality()).isEqualTo("Việt Nam");
        assertThat(resident.getAppAccountStatus()).isEqualTo(ResidentEnums.AppAccountStatus.NONE);
        assertThat(resident.getApartments()).singleElement().satisfies(l -> {
            assertThat(l.getApartmentId()).isEqualTo(10L);
            assertThat(l.getResidenceStatus()).isEqualTo(ResidenceStatus.LIVING);
            assertThat(l.isTempResidenceRegistered()).isTrue();
        });
    }

    @Test
    void firstGeneratedCodeIsCd000001() {
        service.create(request(null, null, link(ResidentRole.TENANT, false, null)), ME);

        assertThat(saved().getCode()).isEqualTo("CD000001");
    }

    @Test
    void createRequiresAnApartment() {
        assertThatThrownBy(() -> service.create(request(null, null, null), ME))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("apartment.apartmentId"));
    }

    @Test
    void duplicateCodeAndPhoneAreConflictsOnTheirFields() {
        when(residents.existsByBuildingIdAndCode(5L, "CD-01")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request(" cd-01 ", null, link(ResidentRole.OWNER, false, null)), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("code");
                });

        when(residents.existsByBuildingIdAndPhone(5L, "0912345678")).thenReturn(true);
        assertThatThrownBy(() -> service.create(request(null, null, link(ResidentRole.OWNER, false, null)), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("phone");
                });
        verify(residents, never()).saveAndFlush(any());
    }

    @Test
    void invalidCccdIsRejected() {
        assertThatThrownBy(() -> service.create(request(null, "12345", link(ResidentRole.OWNER, false, null)), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("idNumber");
                    assertThat(e.getMessage()).isEqualTo("Số CCCD gồm 12 chữ số");
                });
    }

    @Test
    void onlyAnOwnerCanBeTheHouseholdHead() {
        assertThatThrownBy(() -> service.create(request(null, null, link(ResidentRole.TENANT, true, null)), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("apartment.householdHead");
                });
    }

    @Test
    void secondHouseholdHeadForTheSameApartmentIsAConflict() {
        Resident other = new Resident();
        other.setFullName("Lê Hoàng Dũng");
        ApartmentResident head = activeLink(99L, 10L, true);
        head.setResident(other);
        when(links.findActiveHead(eq(10L), eq(ResidenceStatus.MOVED_OUT), isNull())).thenReturn(List.of(head));

        assertThatThrownBy(() -> service.create(request(null, null, link(ResidentRole.OWNER, true, null)), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("apartment.householdHead");
                    assertThat(e.getMessage()).isEqualTo("Căn hộ đã có chủ hộ chính: Lê Hoàng Dũng.");
                });
    }

    @Test
    void cannotAddResidentsToAnInactiveBuilding() {
        when(buildingService.requireActive(eq(5L), anyString()))
                .thenThrow(new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "inactive"));

        assertThatThrownBy(() -> service.create(request(null, null, link(ResidentRole.OWNER, false, null)), ME))
                .isInstanceOf(BusinessException.class);
        verify(residents, never()).saveAndFlush(any());
    }

    @Test
    void assigningWithAPastMoveOutDateRecordsHistoryAndDropsTheHeadFlag() {
        Resident resident = existing();
        service.assignApartment(1L, link(ResidentRole.OWNER, true, TODAY));

        assertThat(resident.getApartments()).singleElement().satisfies(l -> {
            assertThat(l.getResidenceStatus()).isEqualTo(ResidenceStatus.MOVED_OUT);
            assertThat(l.isHouseholdHead()).isFalse();
        });
        assertThat(resident.overallStatus()).isEqualTo(ResidenceStatus.MOVED_OUT);
    }

    @Test
    void cannotAssignTheSameApartmentTwiceWhileLivingThere() {
        existing(activeLink(7L, 10L, false));

        assertThatThrownBy(() -> service.assignApartment(1L, link(ResidentRole.FAMILY, false, null)))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("apartmentId");
                });
    }

    @Test
    void cannotAssignAnApartmentOfAnotherBuilding() {
        existing();
        apartment.setBuildingId(6L);

        assertThatThrownBy(() -> service.assignApartment(1L, link(ResidentRole.FAMILY, false, null)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getMessage()).isEqualTo("Căn hộ không thuộc tòa nhà của cư dân."));
    }

    @Test
    void moveOutEndsEveryActiveLinkAndClearsTheHeadFlag() {
        Resident resident = existing(activeLink(7L, 10L, true), activeLink(8L, 11L, false));

        service.moveOut(1L, new ResidentDtos.MoveOutRequest(TODAY, null));

        assertThat(resident.getApartments()).allSatisfy(l -> {
            assertThat(l.getResidenceStatus()).isEqualTo(ResidenceStatus.MOVED_OUT);
            assertThat(l.getMoveOutDate()).isEqualTo(TODAY);
            assertThat(l.isHouseholdHead()).isFalse();
        });
    }

    @Test
    void moveOutOfOneApartmentKeepsTheOthers() {
        Resident resident = existing(activeLink(7L, 10L, false), activeLink(8L, 11L, false));

        service.moveOut(1L, new ResidentDtos.MoveOutRequest(TODAY, List.of(8L)));

        assertThat(resident.activeLinks()).extracting(ApartmentResident::getId).containsExactly(7L);
        assertThat(resident.overallStatus()).isEqualTo(ResidenceStatus.LIVING);
    }

    @Test
    void moveOutCannotBeInTheFuture() {
        existing(activeLink(7L, 10L, false));

        assertThatThrownBy(() -> service.moveOut(1L, new ResidentDtos.MoveOutRequest(TODAY.plusDays(1), null)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("moveOutDate"));
    }

    @Test
    void residentStillLivingSomewhereCannotBeDeleted() {
        existing(activeLink(7L, 10L, false));

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getMessage()).isEqualTo("Cư dân còn đang ở 1 căn hộ, hãy dùng Chuyển đi trước khi xoá.");
                });
        verify(residents, never()).delete(any(Resident.class));
    }

    @Test
    void overallStatusPrefersLivingThenTemporarilyAbsent() {
        Resident resident = new Resident();
        ApartmentResident absent = activeLink(1L, 10L, false);
        absent.setResidenceStatus(ResidenceStatus.TEMP_ABSENT);
        resident.getApartments().add(absent);
        assertThat(resident.overallStatus()).isEqualTo(ResidenceStatus.TEMP_ABSENT);

        resident.getApartments().add(activeLink(2L, 11L, false));
        assertThat(resident.overallStatus()).isEqualTo(ResidenceStatus.LIVING);
    }

    @Test
    void relationshipIsKeptOnTheLink() {
        Resident resident = existing();
        service.assignApartment(1L, new ResidentDtos.LinkRequest(10L, ResidentRole.FAMILY, Relationship.CHILD, false,
                TODAY.minusDays(3), null, ResidenceStatus.TEMP_ABSENT, false, null));

        assertThat(resident.getApartments()).singleElement().satisfies(l -> {
            assertThat(l.getRelationship()).isEqualTo(Relationship.CHILD);
            assertThat(l.getResidenceStatus()).isEqualTo(ResidenceStatus.TEMP_ABSENT);
        });
    }
}
