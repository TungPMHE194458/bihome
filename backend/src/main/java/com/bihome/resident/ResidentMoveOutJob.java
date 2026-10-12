package com.bihome.resident;

import com.bihome.accesscard.AccessCardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mỗi ngày lúc 00:10 (giờ VN): lần cư trú có ngày chuyển đi ≤ hôm nay chuyển sang Đã chuyển đi, rồi thu hồi thẻ từ. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResidentMoveOutJob {

    private final ResidentService residentService;
    private final AccessCardService accessCardService;

    @Scheduled(cron = "0 10 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int updated = residentService.moveOutDue();
        if (updated > 0) {
            log.info("Đã chuyển {} lần cư trú tới hạn sang Đã chuyển đi", updated);
        }
        int revoked = accessCardService.revokeOrphaned();
        if (revoked > 0) {
            log.info("Đã thu hồi {} thẻ từ của cư dân đã chuyển đi", revoked);
        }
    }
}
