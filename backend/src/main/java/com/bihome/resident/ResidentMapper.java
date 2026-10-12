package com.bihome.resident;

import com.bihome.apartment.Apartment;
import com.bihome.common.storage.FileService;
import com.bihome.resident.dto.ResidentDtos;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ResidentMapper {

    private final FileService fileService;

    public ResidentDtos.Summary toSummary(Resident r) {
        List<ApartmentResident> active = r.activeLinks();
        return new ResidentDtos.Summary(r.getId(), r.getBuildingId(), r.getBuilding().getCode(), r.getBuilding().getName(),
                r.getCode(), r.getFullName(), r.getPhone(), r.getEmail(), r.getGender(), r.getDateOfBirth(),
                r.getIdType(), IdNumbers.mask(r.getIdNumber()), avatarUrl(r.getAvatarFileId()),
                active.stream().map(this::toBrief).toList(), r.overallStatus(),
                active.stream().anyMatch(ApartmentResident::isTempResidenceRegistered), r.getAppAccountStatus(),
                r.getCreatedAt(), r.getUpdatedAt());
    }

    public ResidentDtos.Response toResponse(Resident r) {
        return new ResidentDtos.Response(r.getId(), r.getBuildingId(), r.getBuilding().getCode(),
                r.getBuilding().getName(), r.getCode(), r.getFullName(), r.getPhone(), r.getEmail(), r.getGender(),
                r.getDateOfBirth(), r.getIdType(), r.getIdNumber(), IdNumbers.mask(r.getIdNumber()), r.getIdIssueDate(),
                r.getIdIssuePlace(), r.getNationality(), r.getAvatarFileId(), avatarUrl(r.getAvatarFileId()),
                r.getAppAccountStatus(), r.getNote(), r.getApartments().stream().map(this::toLink).toList(),
                r.overallStatus(), r.getCreatedAt(), r.getUpdatedAt(), r.getCreatedBy(), r.getUpdatedBy(),
                r.getVersion());
    }

    public ResidentDtos.LinkResponse toLink(ApartmentResident l) {
        Apartment a = l.getApartment();
        return new ResidentDtos.LinkResponse(l.getId(), l.getResident().getId(), l.getApartmentId(), a.getCode(),
                a.getName(), l.getRole(), l.getRelationship(), l.isHouseholdHead(), l.getMoveInDate(),
                l.getMoveOutDate(), l.getResidenceStatus(), l.isTempResidenceRegistered(), l.getVersion());
    }

    public ResidentDtos.ApartmentMember toMember(ApartmentResident l) {
        Resident r = l.getResident();
        return new ResidentDtos.ApartmentMember(l.getId(), r.getId(), r.getCode(), r.getFullName(), r.getPhone(),
                avatarUrl(r.getAvatarFileId()), l.getRole(), l.getRelationship(), l.isHouseholdHead(),
                l.getMoveInDate(), l.getMoveOutDate(), l.getResidenceStatus(), l.isTempResidenceRegistered(),
                l.getVersion());
    }

    private ResidentDtos.LinkBrief toBrief(ApartmentResident l) {
        Apartment a = l.getApartment();
        return new ResidentDtos.LinkBrief(l.getId(), l.getApartmentId(), a.getCode(), a.getName(), l.getRole(),
                l.isHouseholdHead(), l.getResidenceStatus());
    }

    private String avatarUrl(Long fileId) {
        return fileId == null ? null : fileService.urlFor(fileId);
    }
}
