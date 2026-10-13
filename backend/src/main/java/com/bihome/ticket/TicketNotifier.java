package com.bihome.ticket;

import com.bihome.common.security.CurrentUser;
import com.bihome.notification.NotificationService;
import com.bihome.notification.NotificationType;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentInboxService;
import com.bihome.ticket.TicketEnums.Visibility;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Thông báo trong hệ thống cho các sự kiện của yêu cầu (người thao tác không tự nhận). */
@Component
@RequiredArgsConstructor
class TicketNotifier {

    private final NotificationService notificationService;
    private final AppUserRepository users;
    private final ResidentInboxService residentInbox;

    /** Có người xử lý → báo người đó; chưa có → báo mọi người xử lý được gán làm việc ở tòa. */
    void created(Ticket ticket) {
        List<Long> recipients = ticket.getAssigneeId() != null ? List.of(ticket.getAssigneeId())
                : users.findHandlers("TICKET_WRITE", ticket.getBuildingId(), UserStatus.ACTIVE).stream()
                        .filter(u -> u.getBuildingIds().contains(ticket.getBuildingId()))
                        .map(AppUser::getId)
                        .toList();
        send(recipients, NotificationType.TICKET_CREATED, "Yêu cầu mới " + ticket.getCode(), ticket);
    }

    void assigned(Ticket ticket) {
        if (ticket.getAssigneeId() != null) {
            send(List.of(ticket.getAssigneeId()), NotificationType.TICKET_ASSIGNED,
                    "Bạn được giao xử lý yêu cầu " + ticket.getCode(), ticket);
        }
    }

    void statusChanged(Ticket ticket, String statusLabel) {
        String title = "Yêu cầu " + ticket.getCode() + " chuyển sang " + statusLabel;
        send(followers(ticket), NotificationType.TICKET_STATUS, title, ticket);
        toResidents(ticket, title);
    }

    /** Bình luận công khai của BQL thì báo cả cư dân (app); bình luận nội bộ hoặc do chính cư dân viết thì không. */
    void commented(Ticket ticket, Visibility visibility) {
        send(followers(ticket), NotificationType.TICKET_COMMENT, "Bình luận mới ở yêu cầu " + ticket.getCode(), ticket);
        boolean byResident = CurrentUser.find().map(u -> u.roles().contains("RESIDENT")).orElse(false);
        if (visibility == Visibility.PUBLIC && !byResident) {
            toResidents(ticket, "Ban quản lý đã trả lời yêu cầu " + ticket.getCode());
        }
    }

    /** Cư dân gửi yêu cầu (nếu có), không thì các cư dân có tài khoản app đang ở căn của yêu cầu. */
    private void toResidents(Ticket ticket, String title) {
        if (ticket.getResidentId() != null) {
            residentInbox.toResidents(List.of(ticket.getResidentId()), ResidentInboxItem.Type.TICKET, title,
                    ticket.getTitle(), "/tickets/" + ticket.getId());
        } else if (ticket.getApartmentId() != null) {
            residentInbox.toApartment(ticket.getApartmentId(), ResidentInboxItem.Type.TICKET, title, ticket.getTitle(),
                    "/tickets/" + ticket.getId());
        }
    }

    /** Người xử lý và người tạo yêu cầu. */
    private List<Long> followers(Ticket ticket) {
        List<Long> ids = new ArrayList<>();
        if (ticket.getAssigneeId() != null) {
            ids.add(ticket.getAssigneeId());
        }
        if (ticket.getCreatedBy() != null) {
            users.findByUsernameIn(Set.of(ticket.getCreatedBy())).forEach(u -> ids.add(u.getId()));
        }
        return ids;
    }

    private void send(List<Long> recipients, NotificationType type, String title, Ticket ticket) {
        if (!recipients.isEmpty()) {
            notificationService.notify(recipients, type, title, ticket.getTitle(), "/tickets/" + ticket.getId(),
                    ticket.getBuildingId());
        }
    }
}
