package com.bihome.building;

import com.bihome.building.dto.BuildingDtos;
import com.bihome.common.storage.EntityImage;
import com.bihome.common.storage.FileService;
import com.bihome.common.storage.ImageResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring")
public abstract class BuildingMapper {

    @Autowired
    protected FileService fileService;

    @Mapping(target = "fullAddress", expression = "java(building.fullAddress())")
    @Mapping(target = "coverImageUrl", expression = "java(coverUrl(building))")
    public abstract BuildingDtos.Summary toSummary(Building building);

    @Mapping(target = "fullAddress", expression = "java(building.fullAddress())")
    @Mapping(target = "coverImageUrl", expression = "java(coverUrl(building))")
    public abstract BuildingDtos.Response toResponse(Building building, long residentCount,
                                                    long occupiedApartmentCount);

    public ImageResponse toImage(EntityImage image) {
        return fileService.toImageResponse(image);
    }

    public BuildingDtos.Option toOption(Building building) {
        return new BuildingDtos.Option(building.getId(), building.getCode(), building.getName(),
                building.fullAddress(), coverUrl(building), building.getStatus());
    }

    protected String coverUrl(Building building) {
        return building.coverFileId().map(fileService::urlFor).orElse(null);
    }
}
