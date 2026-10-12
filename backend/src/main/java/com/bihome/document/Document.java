package com.bihome.document;

import com.bihome.audit.AuditTrail;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.common.storage.FileAttachment;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@AuditTrail(module = "DOCUMENT", type = "DOCUMENT", label = {"code", "name"})
@Entity
@Table(name = "DOCUMENT")
public class Document extends BuildingScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CODE", nullable = false, length = 30)
    private String code;

    @Column(name = "NAME", nullable = false, length = 255)
    private String name;

    @Column(name = "DESCRIPTION", length = 2000)
    private String description;

    @Column(name = "CATEGORY_ID", nullable = false)
    private Long categoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CATEGORY_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private DocumentCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "AUDIENCE", nullable = false, length = 30)
    private DocumentAudience audience;

    /** Tệp hiện tại; đổi qua "Thay file" (tệp cũ chuyển sang {@link #versions}). */
    @Column(name = "FILE_ID", nullable = false)
    private Long fileId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "FILE_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private FileAttachment file;

    @Column(name = "FILE_VERSION_NO", nullable = false)
    private int fileVersionNo = 1;

    /** Luôn gán tập mới thay vì sửa tại chỗ (giống ảnh của entity). */
    @ElementCollection
    @CollectionTable(name = "DOCUMENT_TAG", joinColumns = @JoinColumn(name = "DOCUMENT_ID"))
    @Column(name = "TAG", nullable = false, length = 50)
    @BatchSize(size = 50)
    private Set<String> tags = new LinkedHashSet<>();

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNo desc")
    private List<DocumentFileVersion> versions = new ArrayList<>();
}
