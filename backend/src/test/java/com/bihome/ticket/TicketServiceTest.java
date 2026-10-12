package com.bihome.ticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FileService;
import com.bihome.resident.ResidentService;
import com.bihome.ticket.TicketEnums.EntryType;
import com.bihome.ticket.TicketEnums.TicketChannel;
import com.bihome.ticket.TicketEnums.TicketPriority;
import com.bihome.ticket.TicketEnums.TicketStatus;
import com.bihome.ticket.dto.TicketDtos;
import com.bihome.user.AppUserRepository;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    private static final AuthUser ME = new AuthUser(7L, "nv", Set.of("STAFF"), Set.of(), Set.of(5L), false, false);
    private static final Instant NOW = Instant.parse("2026-10-11T03:00:00Z");

    @Mock TicketRepository tickets;
    @Mock TicketEntryRepository entries;
    @Mock TicketCategoryService categoryService;
    @Mock ApartmentService apartmentService;
    @Mock ResidentService residentService;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock FileService fileService;
    @Mock AppUserRepository users;
    @Mock TicketMapper mapper;
    @Mock TicketNotifier notifier;
    @Mock EntityManager entityManager;

    TicketService service;
    TicketCategory category;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new TicketService(tickets, entries, categoryService, apartmentService, residentService, buildingService,
                buildingContext, fileService, users, mapper, notifier, entityManager, clock);
        category = new TicketCategory();
        category.setId(3L);
        category.setStatus(ActiveStatus.ACTIVE);
        category.setResponseSlaHours(2);
        category.setResolutionSlaHours(24);
        lenient().when(categoryService.require(3L)).thenReturn(category);
        lenient().when(buildingContext.requireBuildingId()).thenReturn(5L);
        lenient().when(buildingService.canAccess(5L)).thenReturn(true);
        lenient().when(tickets.incrementCodeCounter("261011")).thenReturn(1);
        lenient().when(tickets.currentCodeCounter("261011")).thenReturn(4L);
        // Lưu yêu cầu mới thì gán id để service đọc lại được sau khi ghi.
        lenient().when(tickets.saveAndFlush(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            if (t.getId() == null) {
                t.setId(1L);
                lenient().when(tickets.findById(1L)).thenReturn(Optional.of(t));
            }
            return t;
        });
    }

    private static TicketDtos.Request request(Long assigneeId) {
        return new TicketDtos.Request(" Mất điện tầng 3 ", " ", 3L, null, null, TicketChannel.HOTLINE,
                TicketPriority.HIGH, assigneeId, List.of(), null);
    }

    private Ticket saved() {
        ArgumentCaptor<Ticket> captor = ArgumentCaptor.forClass(Ticket.class);
        verify(tickets, org.mockito.Mockito.atLeastOnce()).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private Ticket existing(TicketStatus status) {
        Ticket t = new Ticket();
        t.setId(9L);
        t.setBuildingId(5L);
        t.setStatus(status);
        t.setVersion(1L);
        t.setResponseDueAt(OffsetDateTime.now(Clock.fixed(NOW, ZoneId.of("UTC"))).plusHours(2));
        t.setResolutionDueAt(OffsetDateTime.now(Clock.fixed(NOW, ZoneId.of("UTC"))).plusHours(24));
        when(tickets.findById(9L)).thenReturn(Optional.of(t));
        return t;
    }

    private static TicketDtos.StatusRequest move(TicketStatus to, String note) {
        return new TicketDtos.StatusRequest(to, note, null, 1L);
    }

    @Test
    void stateMachineAllowsOnlyTheDefinedTransitions() {
        assertThat(TicketStatus.NEW.next()).containsExactlyInAnyOrder(TicketStatus.RECEIVED, TicketStatus.IN_PROGRESS,
                TicketStatus.CANCELLED);
        assertThat(TicketStatus.WAITING.canMoveTo(TicketStatus.IN_PROGRESS)).isTrue();
        assertThat(TicketStatus.DONE.canMoveTo(TicketStatus.IN_PROGRESS)).isTrue();
        assertThat(TicketStatus.NEW.canMoveTo(TicketStatus.DONE)).isFalse();
        assertThat(TicketStatus.CLOSED.next()).isEmpty();
        assertThat(TicketStatus.CANCELLED.next()).isEmpty();
    }

    @Test
    void createGeneratesTheCodeComputesSlaAndUsesTheDefaultAssigneeOfTheBuilding() {
        category.setDefaultAssigneeId(42L);
        when(categoryService.isHandler(42L, 5L)).thenReturn(true);

        service.create(request(null), ME);

        Ticket t = saved();
        assertThat(t.getCode()).isEqualTo("YC-261011-004");
        assertThat(t.getTitle()).isEqualTo("Mất điện tầng 3");
        assertThat(t.getDescription()).isNull();
        assertThat(t.getStatus()).isEqualTo(TicketStatus.NEW);
        assertThat(t.getResponseDueAt().toInstant()).isEqualTo(NOW.plusSeconds(2 * 3600));
        assertThat(t.getResolutionDueAt().toInstant()).isEqualTo(NOW.plusSeconds(24 * 3600));
        assertThat(t.getAssigneeId()).isEqualTo(42L);
        assertThat(t.getEntries()).extracting(TicketEntry::getType).containsExactly(EntryType.CREATED, EntryType.ASSIGNMENT);
    }

    @Test
    void defaultAssigneeOutsideTheBuildingIsSkipped() {
        category.setDefaultAssigneeId(42L);
        when(categoryService.isHandler(42L, 5L)).thenReturn(false);

        service.create(request(null), ME);

        assertThat(saved().getAssigneeId()).isNull();
    }

    @Test
    void firstTicketOfTheDayCreatesTheCounterRow() {
        when(tickets.incrementCodeCounter("261011")).thenReturn(0, 1);
        when(tickets.currentCodeCounter("261011")).thenReturn(1L);

        assertThat(service.nextCode()).isEqualTo("YC-261011-001");
        verify(tickets).insertCodeCounterIfAbsent("261011");
    }

    @Test
    void invalidTransitionIsRejected() {
        existing(TicketStatus.NEW);

        assertThatThrownBy(() -> service.changeStatus(9L, move(TicketStatus.DONE, null), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.BUSINESS_RULE_VIOLATION);
                    assertThat(e.getMessage()).isEqualTo("Không thể chuyển từ \"Mới\" sang \"Hoàn thành\".");
                });
    }

    @Test
    void cancellingRequiresAReason() {
        existing(TicketStatus.RECEIVED);

        assertThatThrownBy(() -> service.changeStatus(9L, move(TicketStatus.CANCELLED, " "), ME))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("note"));
    }

    @Test
    void startingWorkAssignsTheActorAndRecordsTheFirstResponse() {
        Ticket t = existing(TicketStatus.NEW);

        service.changeStatus(9L, move(TicketStatus.IN_PROGRESS, "Đã cử thợ"), ME);

        assertThat(t.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(t.getAssigneeId()).isEqualTo(7L);
        assertThat(t.getRespondedAt()).isNotNull();
        assertThat(t.getEntries()).extracting(TicketEntry::getType)
                .containsExactly(EntryType.ASSIGNMENT, EntryType.STATUS_CHANGE);
        TicketEntry change = t.getEntries().get(1);
        assertThat(change.getFromStatus()).isEqualTo(TicketStatus.NEW);
        assertThat(change.getToStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(change.getContent()).isEqualTo("Đã cử thợ");
    }

    @Test
    void doneSetsResolvedAtAndReopeningClearsIt() {
        Ticket t = existing(TicketStatus.IN_PROGRESS);
        t.setAssigneeId(7L);

        service.changeStatus(9L, move(TicketStatus.DONE, null), ME);
        assertThat(t.getResolvedAt()).isNotNull();

        t.setVersion(1L);
        service.changeStatus(9L, move(TicketStatus.IN_PROGRESS, "Chưa khắc phục triệt để"), ME);
        assertThat(t.getResolvedAt()).isNull();
    }

    @Test
    void closingKeepsTheResolvedTimeAndSetsClosedAt() {
        Ticket t = existing(TicketStatus.DONE);
        OffsetDateTime resolved = OffsetDateTime.now(Clock.fixed(NOW, ZoneId.of("UTC"))).minusHours(2);
        t.setResolvedAt(resolved);

        service.changeStatus(9L, move(TicketStatus.CLOSED, null), ME);

        assertThat(t.getResolvedAt()).isEqualTo(resolved);
        assertThat(t.getClosedAt()).isNotNull();
    }

    @Test
    void closedTicketsCannotBeEditedOrReassigned() {
        existing(TicketStatus.CLOSED);

        assertThatThrownBy(() -> service.assign(9L, new TicketDtos.AssignRequest(8L, 1L)))
                .hasMessage("Yêu cầu đã đóng, không thể sửa.");
    }

    @Test
    void assigneeMustHandleTicketsInTheBuilding() {
        existing(TicketStatus.RECEIVED);
        when(categoryService.isHandler(8L, 5L)).thenReturn(false);

        assertThatThrownBy(() -> service.assign(9L, new TicketDtos.AssignRequest(8L, 1L)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("assigneeId"));
    }

    @Test
    void ratingIsOnlyForFinishedTickets() {
        existing(TicketStatus.IN_PROGRESS);
        assertThatThrownBy(() -> service.rate(9L, new TicketDtos.RatingRequest(5, null)))
                .hasMessage("Chỉ đánh giá được yêu cầu đã Hoàn thành hoặc Đóng.");
    }

    @Test
    void onlyNewOrCancelledTicketsCanBeDeleted() {
        existing(TicketStatus.IN_PROGRESS);
        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT));
        verify(tickets, never()).delete(any(Ticket.class));
    }

    @Test
    void overdueDependsOnStatusAndBothDeadlines() {
        OffsetDateTime now = OffsetDateTime.now(Clock.fixed(NOW, ZoneId.of("UTC")));
        Ticket t = new Ticket();
        t.setStatus(TicketStatus.NEW);
        t.setResponseDueAt(now.minusMinutes(1));
        t.setResolutionDueAt(now.plusHours(10));
        assertThat(t.isOverdue(now)).isTrue();

        t.setStatus(TicketStatus.RECEIVED);
        assertThat(t.isOverdue(now)).isFalse();

        t.setResolutionDueAt(now.minusMinutes(1));
        assertThat(t.isOverdue(now)).isTrue();

        t.setStatus(TicketStatus.DONE);
        assertThat(t.isOverdue(now)).isFalse();
    }
}
