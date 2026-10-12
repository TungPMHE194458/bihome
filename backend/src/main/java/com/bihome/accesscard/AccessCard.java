package com.bihome.accesscard;

import com.bihome.audit.AuditTrail;
import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.accesscard.AccessCardEnums.CardType;
import com.bihome.apartment.Apartment;
import com.bihome.asset.AssetItem;
import com.bihome.building.Building;
import com.bihome.common.entity.BuildingScopedEntity;
import com.bihome.resident.Resident;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Getter
@Setter
@AuditTrail(module = "ACCESS_CARD", type = "ACCESS_CARD", label = "cardNo")
@Entity
@Table(name = "ACCESS_CARD")
public class AccessCard extends BuildingScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BUILDING_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Building building;

    @Column(name = "CARD_NO", nullable = false, length = 30)
    private String cardNo;

    @Enumerated(EnumType.STRING)
    @Column(name = "CARD_TYPE", nullable = false, length = 20)
    private CardType cardType;

    @Column(name = "APARTMENT_ID")
    private Long apartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "APARTMENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Apartment apartment;

    @Column(name = "RESIDENT_ID")
    private Long residentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RESIDENT_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private Resident resident;

    @Column(name = "ASSET_ITEM_ID")
    private Long assetItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ASSET_ITEM_ID", insertable = false, updatable = false)
    @Setter(AccessLevel.NONE)
    private AssetItem assetItem;

    @Column(name = "ISSUED_DATE")
    private LocalDate issuedDate;

    @Column(name = "EXPIRY_DATE")
    private LocalDate expiryDate;

    @Column(name = "ISSUE_FEE", nullable = false)
    private BigDecimal issueFee = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private CardStatus status;

    @Column(name = "NOTE", length = 1000)
    private String note;

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt desc, id desc")
    @BatchSize(size = 50)
    private List<AccessCardHistory> history = new ArrayList<>();

    public boolean isExpired(LocalDate today) {
        return expiryDate != null && expiryDate.isBefore(today);
    }

    public void clearAssignment() {
        apartmentId = null;
        residentId = null;
        assetItemId = null;
    }
}
