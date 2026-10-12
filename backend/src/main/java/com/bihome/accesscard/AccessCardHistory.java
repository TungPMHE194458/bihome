package com.bihome.accesscard;

import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.accesscard.AccessCardEnums.HistoryAction;
import com.bihome.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Một lần đổi trạng thái / gán thẻ; căn hộ và cư dân lưu dạng chữ (ảnh chụp tại thời điểm đó). */
@Getter
@Setter
@Entity
@Table(name = "ACCESS_CARD_HISTORY")
public class AccessCardHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "CARD_ID", nullable = false, updatable = false)
    private AccessCard card;

    @Enumerated(EnumType.STRING)
    @Column(name = "ACTION", nullable = false, length = 20, updatable = false)
    private HistoryAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "FROM_STATUS", length = 20, updatable = false)
    private CardStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "TO_STATUS", nullable = false, length = 20, updatable = false)
    private CardStatus toStatus;

    @Column(name = "APARTMENT_LABEL", length = 150, updatable = false)
    private String apartmentLabel;

    @Column(name = "RESIDENT_NAME", length = 150, updatable = false)
    private String residentName;

    @Column(name = "NOTE", length = 1000, updatable = false)
    private String note;
}
