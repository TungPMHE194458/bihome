package com.bihome.auth;

import java.time.Duration;

public interface OtpNotifier {

    void sendPasswordResetOtp(String email, String fullName, String otp, Duration validity);
}
