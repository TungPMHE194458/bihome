package com.bihome.notification;

import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.CurrentUser;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.notification.dto.NotificationDtos;
import com.bihome.residentapp.PushSender;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Thông báo trong hệ thống: tạo cho người nhận (bỏ qua chính người thao tác) và đọc của người đang đăng nhập. Người
 * nhận có cài app nhân viên được đẩy thêm push sau khi commit.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private static final int MAX_BODY = 1000;

    private final NotificationRepository notifications;
    private final UserPushTokenRepository pushTokens;
    private final PushSender pushSender;
    private final Clock clock;

    /** Gửi cùng một thông báo cho nhiều người; người đang thao tác không tự nhận thông báo của mình. */
    @Transactional
    public int notify(Collection<Long> recipientIds, NotificationType type, String title, String body, String link,
                      Long buildingId) {
        Long actorId = CurrentUser.find().map(AuthUser::id).orElse(null);
        Set<Long> recipients = new LinkedHashSet<>();
        recipientIds.stream().filter(Objects::nonNull).filter(id -> !id.equals(actorId)).forEach(recipients::add);
        OffsetDateTime now = OffsetDateTime.now(clock);
        List<Notification> batch = recipients.stream().map(id -> {
            Notification n = new Notification();
            n.setRecipientId(id);
            n.setBuildingId(buildingId);
            n.setType(type);
            n.setTitle(title.length() > 200 ? title.substring(0, 199) + "…" : title);
            n.setBody(body == null || body.length() <= MAX_BODY ? body : body.substring(0, MAX_BODY - 1) + "…");
            n.setLink(link);
            n.setCreatedAt(now);
            return n;
        }).toList();
        notifications.saveAll(batch);
        pushAfterCommit(recipients, batch.isEmpty() ? null : batch.getFirst());
        return batch.size();
    }

    private void pushAfterCommit(Set<Long> recipients, Notification sample) {
        if (sample == null) {
            return;
        }
        List<String> tokens = pushTokens.findTokensOfUsers(recipients);
        if (tokens.isEmpty()) {
            return;
        }
        String title = sample.getTitle();
        String body = sample.getBody();
        String link = sample.getLink();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    pushSender.send(tokens, title, body, link);
                }
            });
        } else {
            pushSender.send(tokens, title, body, link);
        }
    }

    /** Thiết bị cài app nhân viên đăng ký nhận push; token đang thuộc người khác thì chuyển sang người hiện tại. */
    @Transactional
    public void registerPushToken(NotificationDtos.PushTokenRequest request) {
        Long me = CurrentUser.get().id();
        OffsetDateTime now = OffsetDateTime.now(clock);
        String value = request.token().trim();
        UserPushToken token = pushTokens.findByToken(value).orElseGet(() -> {
            UserPushToken t = new UserPushToken();
            t.setToken(value);
            t.setCreatedAt(now);
            return t;
        });
        token.setUserId(me);
        token.setPlatform(request.platform());
        token.setUpdatedAt(now);
        pushTokens.save(token);
    }

    @Transactional
    public void unregisterPushToken(String token) {
        pushTokens.deleteByTokenAndUser(token.trim(), CurrentUser.get().id());
    }

    public PageResponse<NotificationDtos.Response> mine(boolean unreadOnly, PageParams pageParams) {
        Long me = CurrentUser.get().id();
        var pageable = pageParams.toPageable(Sort.by(Sort.Direction.DESC, "id"), Map.of());
        var page = unreadOnly
                ? notifications.findByRecipientIdAndReadAtIsNullOrderByIdDesc(me, pageable)
                : notifications.findByRecipientIdOrderByIdDesc(me, pageable);
        return PageResponse.of(page, NotificationService::toResponse);
    }

    public NotificationDtos.UnreadCount unreadCount() {
        return new NotificationDtos.UnreadCount(notifications.countByRecipientIdAndReadAtIsNull(CurrentUser.get().id()));
    }

    @Transactional
    public NotificationDtos.Response markRead(Long id) {
        Notification n = notifications.findByIdAndRecipientId(id, CurrentUser.get().id())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo"));
        if (n.getReadAt() == null) {
            n.setReadAt(OffsetDateTime.now(clock));
        }
        return toResponse(n);
    }

    @Transactional
    public NotificationDtos.UnreadCount markAllRead() {
        notifications.markAllRead(CurrentUser.get().id(), OffsetDateTime.now(clock));
        return new NotificationDtos.UnreadCount(0);
    }

    static NotificationDtos.Response toResponse(Notification n) {
        return new NotificationDtos.Response(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(),
                n.getBuildingId(), n.getReadAt() != null, n.getCreatedAt());
    }
}
