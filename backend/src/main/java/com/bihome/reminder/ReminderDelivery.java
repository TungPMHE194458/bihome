package com.bihome.reminder;

import com.bihome.reminder.Reminder.Channel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** Kết quả gửi một nhắc nhở tới một cư dân qua một kênh ở một lần gửi (tên / căn lưu dạng chữ). */
@Getter
@Setter
@Entity
@Table(name = "REMINDER_DELIVERY")
public class ReminderDelivery {

    public enum Status { SENT, SKIPPED, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "REMINDER_ID", nullable = false, updatable = false)
    private Long reminderId;

    @Column(name = "RUN_NO", nullable = false, updatable = false)
    private int runNo;

    @Column(name = "RESIDENT_ID", nullable = false, updatable = false)
    private Long residentId;

    @Column(name = "RESIDENT_NAME", nullable = false, length = 150)
    private String residentName;

    @Column(name = "APARTMENT_CODE", length = 200)
    private String apartmentCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "CHANNEL", nullable = false, length = 10)
    private Channel channel;

    @Column(name = "DESTINATION", length = 150)
    private String destination;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 10)
    private Status status;

    @Column(name = "NOTE", length = 200)
    private String note;

    @Column(name = "SENT_AT", nullable = false)
    private OffsetDateTime sentAt;
}
