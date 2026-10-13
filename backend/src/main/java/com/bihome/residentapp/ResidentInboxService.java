package com.bihome.residentapp;

import com.bihome.common.exception.NotFoundException;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.residentapp.ResidentInboxItem.Type;
import com.bihome.residentapp.dto.ResidentAppDtos;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Hộp thư app cư dân. Module nghiệp vụ gọi {@code toApartment / toBuilding / toResidents} trong transaction của mình:
 * chỉ cư dân có tài khoản app mới nhận; push gửi sau khi commit (rollback thì không gửi).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentInboxService {

    private static final int TITLE_MAX = 255;
    private static final int BODY_MAX = 2000;

    private final ResidentInboxRepository inbox;
    private final ResidentAccountRepository accounts;
    private final ResidentPushTokenRepository pushTokens;
    private final PushSender pushSender;
    private final Clock clock;

    // ------------------------------------------------------------ Gửi (gọi từ module khác)

    @Transactional
    public void toApartment(Long apartmentId, Type type, String title, String body, String link) {
        deliver(accounts.findResidentIdsInApartment(apartmentId), type, title, body, link);
    }

    @Transactional
    public void toBuilding(Long buildingId, Type type, String title, String body, String link) {
        deliver(accounts.findResidentIdsInBuilding(buildingId), type, title, body, link);
    }

    @Transactional
    public void toResidents(Collection<Long> residentIds, Type type, String title, String body, String link) {
        if (residentIds.isEmpty()) {
            return;
        }
        deliver(accounts.findResidentIdsWithAccount(residentIds), type, title, body, link);
    }

    private void deliver(List<Long> residentIds, Type type, String title, String body, String link) {
        if (residentIds.isEmpty()) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        String t = cut(title, TITLE_MAX);
        String b = body == null ? null : cut(body, BODY_MAX);
        inbox.saveAll(residentIds.stream().distinct().map(id -> {
            ResidentInboxItem item = new ResidentInboxItem();
            item.setResidentId(id);
            item.setType(type);
            item.setTitle(t);
            item.setBody(b);
            item.setLink(link);
            item.setCreatedAt(now);
            return item;
        }).toList());
        List<String> tokens = pushTokens.findTokensOfResidents(residentIds);
        if (tokens.isEmpty()) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    pushSender.send(tokens, t, b, link);
                }
            });
        } else {
            pushSender.send(tokens, t, b, link);
        }
    }

    // ------------------------------------------------------------ Đọc (app cư dân)

    public PageResponse<ResidentAppDtos.InboxItem> list(Long residentId, boolean unreadOnly, PageParams pageParams) {
        // Thứ tự cố định (mới nhất trước) nằm ở tên phương thức repository.
        Pageable pageable = pageParams.toPageable(Sort.unsorted(), Set.of());
        Page<ResidentInboxItem> page = unreadOnly
                ? inbox.findByResidentIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(residentId, pageable)
                : inbox.findByResidentIdOrderByCreatedAtDescIdDesc(residentId, pageable);
        return PageResponse.of(page, ResidentInboxService::toDto);
    }

    public long unreadCount(Long residentId) {
        return inbox.countByResidentIdAndReadAtIsNull(residentId);
    }

    @Transactional
    public ResidentAppDtos.InboxItem markRead(Long residentId, Long id) {
        ResidentInboxItem item = inbox.findByIdAndResidentId(id, residentId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo."));
        if (item.getReadAt() == null) {
            item.setReadAt(OffsetDateTime.now(clock));
        }
        return toDto(item);
    }

    @Transactional
    public void markAllRead(Long residentId) {
        inbox.markAllRead(residentId, OffsetDateTime.now(clock));
    }

    private static ResidentAppDtos.InboxItem toDto(ResidentInboxItem i) {
        return new ResidentAppDtos.InboxItem(i.getId(), i.getType(), i.getTitle(), i.getBody(), i.getLink(),
                i.getReadAt() != null, i.getCreatedAt());
    }

    private static String cut(String s, int max) {
        return s.length() > max ? s.substring(0, max - 1) + "…" : s;
    }
}
