package com.bihome.servicecatalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.building.Building;
import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FileService;
import com.bihome.common.storage.ImageListResolver;
import com.bihome.servicecatalog.dto.ServiceDtos;
import jakarta.persistence.EntityManager;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ServiceOfferingServiceTest {

    @Mock ServiceOfferingRepository services;
    @Mock ServiceTypeService typeService;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock ImageListResolver imageResolver;
    @Mock FileService fileService;
    @Mock EntityManager entityManager;

    @InjectMocks
    ServiceOfferingService service;

    ServiceType cleaning;

    @BeforeEach
    void setUp() throws Exception {
        cleaning = new ServiceType();
        cleaning.setId(3L);
        cleaning.setName("Vệ sinh");
        cleaning.setStatus(ActiveStatus.ACTIVE);
        lenient().when(typeService.require(3L)).thenReturn(cleaning);
        lenient().when(buildingContext.requireBuildingId()).thenReturn(5L);
        // Phản hồi cần building / serviceType (quan hệ chỉ đọc) — giả lập như sau khi refresh.
        lenient().when(services.saveAndFlush(any())).thenAnswer(inv -> {
            ServiceOffering s = inv.getArgument(0);
            set(s, "building", new Building());
            set(s, "serviceType", cleaning);
            return s;
        });
    }

    private static void set(Object target, String field, Object value) throws Exception {
        Field f = ServiceOffering.class.getDeclaredField(field);
        f.setAccessible(true);
        f.set(target, value);
    }

    private static ServiceDtos.Request request(String code) {
        return new ServiceDtos.Request(code, " Vệ sinh căn hộ ", 3L, BigDecimal.valueOf(300000), " giờ ", " ",
                ActiveStatus.ACTIVE, List.of(), null);
    }

    @Test
    void blankCodeGeneratesTheNextDvNumber() {
        when(services.findMaxGeneratedNumber(5L)).thenReturn(12L);

        service.create(request(""), null);

        ArgumentCaptor<ServiceOffering> saved = ArgumentCaptor.forClass(ServiceOffering.class);
        verify(services).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getCode()).isEqualTo("DV0013");
        assertThat(saved.getValue().getName()).isEqualTo("Vệ sinh căn hộ");
        assertThat(saved.getValue().getUnit()).isEqualTo("giờ");
        assertThat(saved.getValue().getDescription()).isNull();
    }

    @Test
    void duplicateCodeInTheBuildingIsAConflict() {
        when(services.existsByBuildingIdAndCode(5L, "VS-01")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request("vs-01"), null))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("code");
                });
    }

    @Test
    void inactiveServiceTypeCannotBeChosen() {
        cleaning.setStatus(ActiveStatus.INACTIVE);

        assertThatThrownBy(() -> service.create(request(null), null))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("serviceTypeId"));
    }
}
