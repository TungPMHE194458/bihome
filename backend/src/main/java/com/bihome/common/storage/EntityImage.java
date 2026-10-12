package com.bihome.common.storage;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.type.NumericBooleanConverter;

/** Một ảnh của entity (bảng *_IMAGE: FILE_ID, IS_COVER, SORT_ORDER do @OrderColumn quản lý). */
@Getter
@Setter
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
public class EntityImage {

    @Column(name = "FILE_ID", nullable = false)
    private Long fileId;

    @Convert(converter = NumericBooleanConverter.class)
    @Column(name = "IS_COVER", nullable = false)
    private boolean cover;
}
