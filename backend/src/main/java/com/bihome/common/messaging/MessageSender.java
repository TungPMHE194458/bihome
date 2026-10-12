package com.bihome.common.messaging;

/** Kênh gửi tin ra ngoài (email / SMS). Chưa có nhà cung cấp: {@link LoggingMessageSender} chỉ ghi log. */
public interface MessageSender {

    enum Channel { EMAIL, SMS }

    /** @return false nếu kênh gửi lỗi (người gọi ghi nhận FAILED) */
    boolean send(Channel channel, String destination, String subject, String text);
}
