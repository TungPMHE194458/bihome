package com.bihome.common.config;

import com.bihome.common.util.AppTime;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.system(AppTime.ZONE);
    }
}
