package com.bihome.ticket;

import com.bihome.common.storage.FileAttachment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tệp của yêu cầu ({@code entryId} null) hoặc của một bình luận. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "TICKET_ATTACHMENT")
public class TicketAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "TICKET_ID", nullable = false, updatable = false)
    private Ticket ticket;

    @Column(name = "COMMENT_ID", updatable = false)
    private Long entryId;

    @Column(name = "FILE_ID", nullable = false, updatable = false)
    private Long fileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FILE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private FileAttachment file;

    public TicketAttachment(Ticket ticket, Long entryId, Long fileId) {
        this.ticket = ticket;
        this.entryId = entryId;
        this.fileId = fileId;
    }
}
