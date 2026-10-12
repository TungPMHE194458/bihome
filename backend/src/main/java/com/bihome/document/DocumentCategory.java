package com.bihome.document;

import com.bihome.audit.AuditTrail;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Formula;

/** Danh mục tài liệu dùng chung cho mọi tòa nhà. */
@Getter
@Setter
@AuditTrail(module = "DOCUMENT", type = "DOCUMENT_CATEGORY", label = "name")
@Entity
@Table(name = "DOCUMENT_CATEGORY")
public class DocumentCategory extends BaseEntity {

    @Column(name = "NAME", nullable = false, length = 100)
    private String name;

    @Column(name = "DESCRIPTION", length = 1000)
    private String description;

    /** Màu chip, dạng #RRGGBB. */
    @Column(name = "COLOR", nullable = false, length = 7)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private ActiveStatus status;

    /** Số tài liệu (mọi tòa) thuộc danh mục; dùng được trong sắp xếp ("documentCount"). */
    @Formula("(select count(*) from DOCUMENT d where d.CATEGORY_ID = ID)")
    @Setter(AccessLevel.NONE)
    private long documentCount;
}
