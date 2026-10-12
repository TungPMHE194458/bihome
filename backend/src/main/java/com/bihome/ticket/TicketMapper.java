package com.bihome.ticket;

import com.bihome.apartment.Apartment;
import com.bihome.common.storage.FileAttachment;
import com.bihome.common.storage.FileService;
import com.bihome.resident.Resident;
import com.bihome.ticket.dto.TicketDtos;
import com.bihome.user.AppUser;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TicketMapper {

    private final FileService fileService;
    private final Clock clock;

    public TicketDtos.CategoryResponse toResponse(TicketCategory c) {
        return new TicketDtos.CategoryResponse(c.getId(), c.getName(), c.getDescription(), c.getResponseSlaHours(),
                c.getResolutionSlaHours(), c.getDefaultAssigneeId(), displayName(c.getDefaultAssignee()), c.getStatus(),
                c.getTicketCount(), c.getCreatedAt(), c.getUpdatedAt(), c.getVersion());
    }

    public TicketDtos.CategoryOption toOption(TicketCategory c) {
        return new TicketDtos.CategoryOption(c.getId(), c.getName(), c.getResponseSlaHours(), c.getResolutionSlaHours(),
                c.getDefaultAssigneeId());
    }

    public TicketDtos.Assignee toAssignee(AppUser u) {
        Long avatar = u.getProfile() == null ? null : u.getProfile().getAvatarFileId();
        return new TicketDtos.Assignee(u.getId(), u.getUsername(), displayName(u),
                avatar == null ? null : fileService.urlFor(avatar));
    }

    public TicketDtos.Summary toSummary(Ticket t) {
        Apartment a = t.getApartment();
        Resident r = t.getResident();
        return new TicketDtos.Summary(t.getId(), t.getBuildingId(), t.getBuilding().getName(), t.getCode(), t.getTitle(),
                t.getCategoryId(), t.getCategory().getName(), t.getApartmentId(), a == null ? null : a.getCode(),
                a == null ? null : a.getName(), t.getResidentId(), r == null ? null : r.getFullName(),
                r == null ? null : r.getPhone(), t.getChannel(), t.getPriority(), t.getAssigneeId(),
                displayName(t.getAssignee()), t.getStatus(), t.getResponseDueAt(), t.getResolutionDueAt(),
                t.isOverdue(OffsetDateTime.now(clock)), t.getRating(), t.getCreatedAt(), t.getUpdatedAt(),
                t.getVersion());
    }

    public TicketDtos.Response toResponse(Ticket t, String createdByName) {
        List<TicketDtos.Attachment> attachments = t.getAttachments().stream()
                .filter(a -> a.getEntryId() == null).map(this::toAttachment).toList();
        return new TicketDtos.Response(toSummary(t), t.getDescription(), t.getRespondedAt(), t.getResolvedAt(),
                t.getClosedAt(), t.getRatingComment(), attachments,
                t.getStatus().next().stream().sorted().toList(), t.getCreatedBy(), createdByName);
    }

    /** @param names họ tên theo username (người thực hiện) */
    public TicketDtos.TimelineEntry toEntry(TicketEntry e, List<TicketAttachment> attachments, Map<String, String> names) {
        return new TicketDtos.TimelineEntry(e.getId(), e.getType(), e.getVisibility(), e.getContent(), e.getFromStatus(),
                e.getToStatus(), e.getAssigneeId(), displayName(e.getAssignee()), e.getCreatedBy(),
                names.getOrDefault(e.getCreatedBy(), e.getCreatedBy()),
                e.getCreatedAt(), attachments.stream().filter(a -> Objects.equals(a.getEntryId(), e.getId()))
                .map(this::toAttachment).toList());
    }

    public TicketDtos.Attachment toAttachment(TicketAttachment a) {
        FileAttachment f = a.getFile();
        return new TicketDtos.Attachment(a.getId(), a.getFileId(), f.getOriginalName(), f.getFileSize(),
                f.getContentType(), fileService.urlFor(a.getFileId()));
    }

    static String displayName(AppUser u) {
        if (u == null) {
            return null;
        }
        String name = u.getProfile() == null ? null : u.getProfile().getFullName();
        return name == null || name.isBlank() ? u.getUsername() : name;
    }
}
