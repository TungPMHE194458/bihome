package com.bihome.common.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Tắt bằng bihome.scheduling.enabled=false (vd khi chạy integration test). */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "bihome.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
