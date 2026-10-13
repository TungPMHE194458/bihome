package com.bihome.residentapp;

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

/** Một tin trong hộp thư app cư dân; không ghi lịch sử hoạt động. */
@Getter
@Setter
@Entity
@Table(name = "RESIDENT_INBOX")
public class ResidentInboxItem {

    public enum Type { FEE_NOTICE, PAYMENT, TICKET, BOOKING, ANNOUNCEMENT, REMINDER, SOS, SYSTEM, DECLARATION, SURVEY, SERVICE_ORDER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "RESIDENT_ID", nullable = false, updatable = false)
    private Long residentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "TYPE_CODE", nullable = false, length = 30)
    private Type type;

    @Column(name = "TITLE", nullable = false, length = 255)
    private String title;

    @Column(name = "BODY", length = 2000)
    private String body;

    @Column(name = "LINK", length = 255)
    private String link;

    @Column(name = "READ_AT")
    private OffsetDateTime readAt;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
