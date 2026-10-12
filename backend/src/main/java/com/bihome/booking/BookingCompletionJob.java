package com.bihome.booking;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mỗi 15 phút chuyển các lượt đã duyệt đã hết giờ sang Hoàn thành. */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingCompletionJob {

    private final BookingService bookingService;

    @Scheduled(cron = "0 */15 * * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int n = bookingService.completeFinished();
        if (n > 0) {
            log.info("Đã hoàn thành {} lượt đăng ký tiện ích hết giờ", n);
        }
    }
}
