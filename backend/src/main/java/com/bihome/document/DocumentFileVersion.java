package com.bihome.document;

import com.bihome.common.entity.BaseEntity;
import com.bihome.common.storage.FileAttachment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

/** Tệp cũ của tài liệu, lưu lại khi thay tệp. CREATED_AT/BY = lúc và người thay tệp. */
@Getter
@Setter
@Entity
@Table(name = "DOCUMENT_FILE_VERSION")
public class DocumentFileVersion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "DOCUMENT_ID", nullable = false, updatable = false)
    private Document document;

    @Column(name = "VERSION_NO", nullable = false, updatable = false)
    private int versionNo;

    @Column(name = "FILE_ID", nullable = false, updatable = false)
    private Long fileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FILE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private FileAttachment file;

    /** Ghi chú khi thay tệp này bằng phiên bản mới. */
    @Column(name = "NOTE", length = 500)
    private String note;
}
