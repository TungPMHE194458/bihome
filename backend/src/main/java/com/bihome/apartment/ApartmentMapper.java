package com.bihome.apartment;

import com.bihome.apartment.dto.ApartmentDtos;
import com.bihome.common.storage.EntityImage;
import com.bihome.common.storage.FileService;
import com.bihome.common.storage.ImageResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring")
public abstract class ApartmentMapper {

    @Autowired
    protected FileService fileService;

    @Mapping(target = "buildingCode", source = "apartment.building.code")
    @Mapping(target = "buildingName", source = "apartment.building.name")
    @Mapping(target = "coverImageUrl", expression = "java(coverUrl(apartment))")
    public abstract ApartmentDtos.Summary toSummary(Apartment apartment, String ownerName);

    @Mapping(target = "buildingCode", source = "apartment.building.code")
    @Mapping(target = "buildingName", source = "apartment.building.name")
    @Mapping(target = "coverImageUrl", expression = "java(coverUrl(apartment))")
    public abstract ApartmentDtos.Response toResponse(Apartment apartment, String ownerName);

    public ApartmentDtos.Option toOption(Apartment apartment) {
        return new ApartmentDtos.Option(apartment.getId(), apartment.getCode(), apartment.getName(),
                apartment.getBuildingId(), apartment.getBuilding().getName());
    }

    public ImageResponse toImage(EntityImage image) {
        return fileService.toImageResponse(image);
    }

    protected String coverUrl(Apartment apartment) {
        return apartment.coverFileId().map(fileService::urlFor).orElse(null);
    }
}
