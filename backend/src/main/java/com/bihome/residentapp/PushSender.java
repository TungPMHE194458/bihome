package com.bihome.residentapp;

import com.bihome.notification.UserPushTokenRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;

/**
 * Gửi push qua Expo Push Service (Expo chuyển tiếp tới APNs / FCM) trên luồng riêng để không làm chậm request.
 * Dùng chung cho app cư dân và app nhân viên. {@code bihome.resident-app.push-enabled=false} (local / test) thì chỉ
 * ghi log. Token báo DeviceNotRegistered bị xoá (ở cả hai bảng token).
 */
@Slf4j
@Component
public class PushSender {

    private static final String EXPO_URL = "https://exp.host/--/api/v2/push/send";
    private static final int BATCH = 100;

    private final ResidentAppProperties properties;
    private final ResidentPushTokenRepository tokens;
    private final UserPushTokenRepository staffTokens;
    private final TransactionTemplate transaction;
    private final RestClient client;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public PushSender(ResidentAppProperties properties, ResidentPushTokenRepository tokens,
                      UserPushTokenRepository staffTokens, TransactionTemplate transaction, RestClient.Builder builder) {
        this.properties = properties;
        this.tokens = tokens;
        this.staffTokens = staffTokens;
        this.transaction = transaction;
        this.client = builder.baseUrl(EXPO_URL).build();
    }

    public void send(Collection<String> pushTokens, String title, String body, String link) {
        if (pushTokens.isEmpty()) {
            return;
        }
        if (!properties.pushEnabled()) {
            log.info("[push tắt] {} thiết bị: {} – {}", pushTokens.size(), title, body);
            return;
        }
        List<String> all = List.copyOf(pushTokens);
        executor.submit(() -> {
            for (int i = 0; i < all.size(); i += BATCH) {
                deliver(all.subList(i, Math.min(i + BATCH, all.size())), title, body, link);
            }
        });
    }

    private void deliver(List<String> batch, String title, String body, String link) {
        List<Map<String, Object>> messages = batch.stream().map(t -> Map.<String, Object>of(
                "to", t, "title", title, "body", body == null ? "" : body, "sound", "default",
                "data", Map.of("link", link == null ? "/" : link))).toList();
        try {
            RestClient.RequestBodySpec request = client.post().contentType(MediaType.APPLICATION_JSON);
            if (properties.expoAccessToken() != null && !properties.expoAccessToken().isBlank()) {
                request = request.header("Authorization", "Bearer " + properties.expoAccessToken());
            }
            ExpoResponse response = request.body(messages).retrieve().body(ExpoResponse.class);
            if (response == null || response.data() == null) {
                return;
            }
            List<String> stale = new ArrayList<>();
            for (int i = 0; i < response.data().size() && i < batch.size(); i++) {
                ExpoTicket ticket = response.data().get(i);
                if ("error".equals(ticket.status())) {
                    log.warn("Push lỗi: {} {}", ticket.message(), ticket.details());
                    if (ticket.details() != null && "DeviceNotRegistered".equals(ticket.details().get("error"))) {
                        stale.add(batch.get(i));
                    }
                }
            }
            if (!stale.isEmpty()) {
                transaction.executeWithoutResult(s -> {
                    tokens.deleteTokens(stale);
                    staffTokens.deleteTokens(stale);
                });
            }
        } catch (RuntimeException e) {
            log.warn("Không gửi được push tới Expo: {}", e.getMessage());
        }
    }

    record ExpoResponse(List<ExpoTicket> data) {
    }

    record ExpoTicket(String status, String id, String message, Map<String, Object> details) {
    }
}
