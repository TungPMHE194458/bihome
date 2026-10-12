package com.bihome.common.util;

public final class PhoneNumbers {

    /** Cho phép rỗng (trường không bắt buộc); số di động VN dạng 0xxxxxxxxx hoặc +84xxxxxxxxx. */
    public static final String REGEX = "^$|^(0|\\+84)[35789]\\d{8}$";
    public static final String MESSAGE = "Số điện thoại không đúng định dạng Việt Nam.";

    private PhoneNumbers() {
    }

    public static String normalize(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String trimmed = phone.trim();
        return trimmed.startsWith("+84") ? "0" + trimmed.substring(3) : trimmed;
    }
}
