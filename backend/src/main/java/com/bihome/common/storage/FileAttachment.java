package com.bihome.common.storage;

import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "FILE_ATTACHMENT")
public class FileAttachment extends BaseEntity {

    @Column(name = "ORIGINAL_NAME", nullable = false, length = 255)
    private String originalName;

    @Column(name = "STORED_PATH", nullable = false, length = 500)
    private String storedPath;

    @Column(name = "FILE_SIZE", nullable = false)
    private long fileSize;

    @Column(name = "CONTENT_TYPE", nullable = false, length = 150)
    private String contentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "PURPOSE", nullable = false, length = 30)
    private FilePurpose purpose;
}
