package com.bihome.feenotice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Hằng ngày 00:20: thông báo phí quá hạn thanh toán mà chưa thu đủ → Quá hạn. */
@Slf4j
@Component
@RequiredArgsConstructor
public class FeeNoticeOverdueJob {

    private final FeeNoticeService feeNoticeService;

    @Scheduled(cron = "0 20 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int count = feeNoticeService.markOverdue();
        if (count > 0) {
            log.info("Đã chuyển {} thông báo phí sang Quá hạn", count);
        }
    }
}
