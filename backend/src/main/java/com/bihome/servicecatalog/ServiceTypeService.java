package com.bihome.servicecatalog;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.servicecatalog.dto.ServiceDtos;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Loại dịch vụ dùng chung cho mọi tòa; đang có dịch vụ thì chỉ cho chuyển Ngừng hoạt động. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceTypeService {

    private static final Sort DEFAULT_SORT = Sort.by("name");
    private static final Set<String> SORTABLE = Set.of("name", "serviceCount", "createdAt");

    private final ServiceTypeRepository types;

    public PageResponse<ServiceDtos.TypeResponse> list(ServiceDtos.TypeFilter f, PageParams pageParams) {
        var spec = SpecificationBuilder.<ServiceType>create()
                .likeAny(f.keyword(), "name", "description")
                .like("name", f.name())
                .eq("status", f.status())
                .dateBetween("createdAt", f.createdFrom(), f.createdTo())
                .build();
        return PageResponse.of(types.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORTABLE)), ServiceTypeService::toResponse);
    }

    public List<ServiceDtos.TypeOption> options() {
        return types.findByStatusOrderByNameAsc(ActiveStatus.ACTIVE).stream()
                .map(t -> new ServiceDtos.TypeOption(t.getId(), t.getName())).toList();
    }

    public ServiceDtos.TypeResponse get(Long id) {
        return toResponse(require(id));
    }

    @Transactional
    public ServiceDtos.TypeResponse create(ServiceDtos.TypeRequest req) {
        if (types.existsByNameIgnoreCase(req.name().trim())) {
            throw duplicateName();
        }
        ServiceType type = new ServiceType();
        apply(type, req);
        types.saveAndFlush(type);
        return toResponse(type);
    }

    @Transactional
    public ServiceDtos.TypeResponse update(Long id, ServiceDtos.TypeRequest req) {
        ServiceType type = require(id);
        if (req.version() == null || !Objects.equals(type.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (types.existsByNameIgnoreCaseAndIdNot(req.name().trim(), id)) {
            throw duplicateName();
        }
        apply(type, req);
        types.saveAndFlush(type);
        return toResponse(type);
    }

    @Transactional
    public ServiceDtos.TypeResponse changeStatus(Long id, ActiveStatus status) {
        ServiceType type = require(id);
        type.setStatus(status);
        types.saveAndFlush(type);
        return toResponse(type);
    }

    @Transactional
    public void delete(Long id) {
        ServiceType type = require(id);
        if (type.getServiceCount() > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Loại dịch vụ đang có " + type.getServiceCount() + " dịch vụ, hãy chuyển sang Ngừng hoạt động.");
        }
        types.delete(type);
    }

    ServiceType require(Long id) {
        return types.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy loại dịch vụ."));
    }

    private static void apply(ServiceType type, ServiceDtos.TypeRequest req) {
        type.setName(req.name().trim());
        type.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        type.setStatus(req.status());
    }

    private static ServiceDtos.TypeResponse toResponse(ServiceType t) {
        return new ServiceDtos.TypeResponse(t.getId(), t.getName(), t.getDescription(), t.getStatus(), t.getServiceCount(),
                t.getCreatedAt(), t.getUpdatedAt(), t.getVersion());
    }

    private static BusinessException duplicateName() {
        return BusinessException.field(ErrorCode.CONFLICT, "name", "Tên loại dịch vụ đã tồn tại.");
    }
}
