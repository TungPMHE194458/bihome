package com.bihome.auth;

import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Chưa có hạ tầng email: môi trường local ghi OTP ra log, môi trường khác chỉ cảnh báo (không lộ OTP). */
@Slf4j
@Component
public class LoggingOtpNotifier implements OtpNotifier {

    private final boolean logOtp;

    public LoggingOtpNotifier(@Value("${bihome.auth.log-otp:false}") boolean logOtp) {
        this.logOtp = logOtp;
    }

    @Override
    public void sendPasswordResetOtp(String email, String fullName, String otp, Duration validity) {
        if (logOtp) {
            log.info("[LOCAL] OTP đặt lại mật khẩu cho {}: {} (hiệu lực {} phút)", email, otp, validity.toMinutes());
        } else {
            log.warn("Chưa cấu hình kênh gửi email, không gửi được OTP đặt lại mật khẩu cho {}", email);
        }
    }
}
