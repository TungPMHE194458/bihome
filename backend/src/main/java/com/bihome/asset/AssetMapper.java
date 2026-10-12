package com.bihome.asset;

import com.bihome.asset.dto.AssetDtos;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AssetMapper {

    @Mapping(target = "buildingName", source = "building.name")
    AssetDtos.CategoryResponse toResponse(AssetCategory category);

    AssetDtos.CategoryOption toOption(AssetCategory category);

    @Mapping(target = "buildingName", source = "apartment.building.name")
    @Mapping(target = "apartmentCode", source = "apartment.code")
    @Mapping(target = "apartmentName", source = "apartment.name")
    @Mapping(target = "categoryName", source = "category.name")
    AssetDtos.ItemResponse toResponse(AssetItem item);
}
