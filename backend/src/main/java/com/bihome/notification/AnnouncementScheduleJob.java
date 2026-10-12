package com.bihome.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mỗi phút gửi các thông báo đã đến giờ hẹn. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnnouncementScheduleJob {

    private final AnnouncementService announcementService;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int sent = announcementService.sendDue();
        if (sent > 0) {
            log.info("Đã gửi {} thông báo hẹn giờ", sent);
        }
    }
}
