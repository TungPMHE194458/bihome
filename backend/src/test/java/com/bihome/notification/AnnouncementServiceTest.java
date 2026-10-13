package com.bihome.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.building.BuildingRepository;
import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FileAttachmentRepository;
import com.bihome.common.storage.FileService;
import com.bihome.notification.Announcement.Audience;
import com.bihome.notification.Announcement.Category;
import com.bihome.notification.Announcement.Status;
import com.bihome.residentapp.ResidentInboxService;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnnouncementServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-11T03:00:00Z");

    @Mock AnnouncementRepository announcements;
    @Mock BuildingRepository buildings;
    @Mock FileAttachmentRepository files;
    @Mock FileService fileService;
    @Mock NotificationService notificationService;
    @Mock ResidentInboxService residentInbox;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock EntityManager entityManager;

    AnnouncementService service;

    @BeforeEach
    void setUp() {
        service = new AnnouncementService(announcements, buildings, files, fileService, notificationService,
                residentInbox, buildingService, buildingContext, entityManager, Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    @Test
    void dueScheduledAnnouncementsAreSentToStaffAndCountResidents() {
        Announcement a = announcement(Audience.ALL, Status.SCHEDULED);
        when(announcements.findDueIds(any())).thenReturn(List.of(5L));
        when(announcements.findById(5L)).thenReturn(Optional.of(a));
        when(announcements.findStaffIds(1L)).thenReturn(List.of(11L, 12L));
        when(notificationService.notify(eq(List.of(11L, 12L)), eq(NotificationType.ANNOUNCEMENT), eq("Cắt nước"),
                anyString(), eq("/announcements?view=5"), eq(1L))).thenReturn(2);
        when(buildings.countResidents(1L)).thenReturn(40L);

        assertThat(service.sendDue()).isEqualTo(1);
        assertThat(a.getStatus()).isEqualTo(Status.SENT);
        assertThat(a.getStaffCount()).isEqualTo(2);
        assertThat(a.getResidentCount()).isEqualTo(40);
        assertThat(a.getSentBy()).isEqualTo("bqm");
        assertThat(a.getSentAt()).isEqualTo(OffsetDateTime.ofInstant(NOW, ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    @Test
    void residentOnlyAnnouncementsDoNotNotifyStaff() {
        Announcement a = announcement(Audience.RESIDENT, Status.SCHEDULED);
        when(announcements.findDueIds(any())).thenReturn(List.of(5L));
        when(announcements.findById(5L)).thenReturn(Optional.of(a));

        service.sendDue();
        verify(notificationService, never()).notify(any(), any(), any(), any(), any(), any());
        assertThat(a.getStaffCount()).isZero();
    }

    @Test
    void sentAnnouncementsCannotBeDeleted() {
        Announcement a = announcement(Audience.STAFF, Status.SENT);
        when(announcements.findById(5L)).thenReturn(Optional.of(a));
        when(buildingService.canAccess(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(5L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Thông báo đã gửi, không sửa / xoá được.");
        verify(announcements, never()).delete(any(Announcement.class));
    }

    private static Announcement announcement(Audience audience, Status status) {
        Announcement a = new Announcement();
        a.setId(5L);
        a.setBuildingId(1L);
        a.setTitle("Cắt nước");
        a.setContent("Cắt nước từ 8h đến 11h.");
        a.setCategory(Category.MAINTENANCE);
        a.setAudience(audience);
        a.setStatus(status);
        a.setCreatedBy("bqm");
        a.setVersion(0L);
        return a;
    }
}
