package com.bihome.building;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.building.dto.BuildingDtos;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.ImageListResolver;
import com.bihome.user.AppUserRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class BuildingServiceTest {

    private static final AuthUser ADMIN = new AuthUser(1L, "admin", Set.of("SUPER_ADMIN"), Set.of(), Set.of(), true, false);

    @Mock BuildingRepository buildings;
    @Mock ImageListResolver imageResolver;
    @Mock AppUserRepository users;
    @Mock BuildingMapper mapper;
    @Mock BuildingContext buildingContext;

    @InjectMocks
    BuildingService service;

    private static BuildingDtos.Request request(String code) {
        return new BuildingDtos.Request(code, " Sky ", "Hà Nội", "Cầu Giấy", "Số 1", BuildingType.BUILDING, 10, 1,
                null, " ", "BQL@X.VN", null, ActiveStatus.ACTIVE, List.of(), null);
    }

    @Test
    void createNormalizesFieldsAndDoesNotReassignAdmins() {
        when(buildings.existsByCode("SKY-01")).thenReturn(false);

        service.create(request(" sky-01 "), ADMIN);

        ArgumentCaptor<Building> saved = ArgumentCaptor.forClass(Building.class);
        verify(buildings).saveAndFlush(saved.capture());
        Building b = saved.getValue();
        assertThat(b.getCode()).isEqualTo("SKY-01");
        assertThat(b.getName()).isEqualTo("Sky");
        assertThat(b.getHotline()).isNull();
        assertThat(b.getManagementEmail()).isEqualTo("bql@x.vn");
        verify(users, never()).findById(any());
    }

    @Test
    void buildingsOutsideTheUsersScopeAreNotFound() {
        when(buildingContext.accessibleBuildingIds()).thenReturn(Optional.of(Set.of(1L)));
        when(buildings.findById(2L)).thenReturn(Optional.of(new Building()));

        assertThatThrownBy(() -> service.get(2L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateRequiresTheCurrentVersion() {
        Building existing = new Building();
        existing.setVersion(3L);
        when(buildingContext.accessibleBuildingIds()).thenReturn(Optional.empty());
        when(buildings.findById(9L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.update(9L, request("A"), ADMIN))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VERSION_CONFLICT));
    }

    @Test
    void deleteIsBlockedWhileApartmentsExist() {
        Building existing = new Building();
        ReflectionTestUtils.setField(existing, "apartmentCount", 3L);
        when(buildingContext.accessibleBuildingIds()).thenReturn(Optional.empty());
        when(buildings.findById(4L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.delete(4L))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getMessage()).isEqualTo("Tòa nhà còn 3 căn hộ, hãy chuyển sang Không hoạt động.");
                });
        verify(buildings, never()).delete(any(Building.class));
    }

    @Test
    void deleteRemovesAccessAssignmentsFirst() {
        Building existing = new Building();
        when(buildingContext.accessibleBuildingIds()).thenReturn(Optional.empty());
        when(buildings.findById(4L)).thenReturn(Optional.of(existing));

        service.delete(4L);

        verify(buildings).deleteUserAssignments(4L);
        verify(buildings).delete(existing);
    }
}
