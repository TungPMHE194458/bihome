package com.bihome.notification;

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

/** Thông báo trong hệ thống của một người dùng (chuông trên header); không audit. */
@Getter
@Setter
@Entity
@Table(name = "NOTIFICATION")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "RECIPIENT_ID", nullable = false, updatable = false)
    private Long recipientId;

    @Column(name = "BUILDING_ID", updatable = false)
    private Long buildingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "TYPE_CODE", nullable = false, updatable = false, length = 30)
    private NotificationType type;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "BODY", length = 1000)
    private String body;

    @Column(name = "LINK", length = 300)
    private String link;

    @Column(name = "READ_AT")
    private OffsetDateTime readAt;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
