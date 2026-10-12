package com.bihome.accesscard;

import com.bihome.accesscard.dto.AccessCardDtos;
import com.bihome.apartment.Apartment;
import com.bihome.asset.AssetItem;
import com.bihome.resident.Resident;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
public class AccessCardMapper {

    public AccessCardDtos.Response toResponse(AccessCard c, LocalDate today) {
        Apartment a = c.getApartment();
        Resident r = c.getResident();
        AssetItem i = c.getAssetItem();
        return new AccessCardDtos.Response(c.getId(), c.getBuildingId(), c.getBuilding().getName(), c.getCardNo(),
                c.getCardType(), c.getApartmentId(), a == null ? null : a.getCode(), a == null ? null : a.getName(),
                c.getResidentId(), r == null ? null : r.getFullName(), c.getAssetItemId(), i == null ? null : i.getName(),
                i == null ? null : i.getPlateNumber(), c.getIssuedDate(), c.getExpiryDate(), c.isExpired(today),
                c.getIssueFee(), c.getStatus(), c.getNote(), c.getStatus().next().stream().sorted().toList(),
                c.getCreatedAt(), c.getUpdatedAt(), c.getVersion());
    }

    public AccessCardDtos.HistoryEntry toHistory(AccessCardHistory h) {
        return new AccessCardDtos.HistoryEntry(h.getId(), h.getAction(), h.getFromStatus(), h.getToStatus(),
                h.getApartmentLabel(), h.getResidentName(), h.getNote(), h.getCreatedBy(), h.getCreatedAt());
    }
}
