package com.bihome.asset;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mỗi ngày lúc 00:05 (giờ VN): hạng mục có ngày ra ≤ hôm nay chuyển sang Không hoạt động. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AssetItemExpiryJob {

    private final AssetItemService assetItemService;

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int updated = assetItemService.deactivateExited();
        if (updated > 0) {
            log.info("Đã chuyển {} hạng mục hết hạn sang Không hoạt động", updated);
        }
    }
}
