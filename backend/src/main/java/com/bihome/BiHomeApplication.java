package com.bihome;

import com.bihome.common.util.AppTime;
import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BiHomeApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone(AppTime.ZONE));
        SpringApplication.run(BiHomeApplication.class, args);
    }
}
