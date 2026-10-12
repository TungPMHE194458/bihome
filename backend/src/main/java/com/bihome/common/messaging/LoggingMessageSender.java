package com.bihome.common.messaging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Môi trường chưa nối nhà cung cấp email / SMS: ghi log thay cho gửi thật (không ghi nội dung đầy đủ). */
@Slf4j
@Component
public class LoggingMessageSender implements MessageSender {

    @Override
    public boolean send(Channel channel, String destination, String subject, String text) {
        log.info("[LOCAL] {} tới {}: {} ({} ký tự)", channel, destination, subject, text == null ? 0 : text.length());
        return true;
    }
}
