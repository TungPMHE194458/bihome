package com.bihome.ticket;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.ticket.dto.TicketDtos;
import com.bihome.user.AppUser;
import com.bihome.user.AppUserRepository;
import com.bihome.user.UserStatus;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Danh mục yêu cầu dùng chung cho mọi tòa; đang có yêu cầu thì chỉ cho chuyển Ngừng hoạt động. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketCategoryService {

    static final String HANDLER_PERMISSION = "TICKET_WRITE";
    private static final Sort DEFAULT_SORT = Sort.by("name");
    private static final Set<String> SORTABLE = Set.of("name", "responseSlaHours", "resolutionSlaHours", "ticketCount",
            "createdAt");

    private final TicketCategoryRepository categories;
    private final AppUserRepository users;
    private final TicketMapper mapper;
    private final EntityManager entityManager;

    public PageResponse<TicketDtos.CategoryResponse> list(TicketDtos.CategoryFilter filter, PageParams pageParams) {
        return PageResponse.of(categories.findAll(TicketSpecifications.categories(filter),
                pageParams.toPageable(DEFAULT_SORT, SORTABLE)), mapper::toResponse);
    }

    public List<TicketDtos.CategoryOption> options() {
        return categories.findByStatusOrderByNameAsc(ActiveStatus.ACTIVE).stream().map(mapper::toOption).toList();
    }

    public TicketDtos.CategoryResponse get(Long id) {
        return mapper.toResponse(require(id));
    }

    /** Người có quyền xử lý yêu cầu; {@code buildingId} null = mọi tòa (chọn người phụ trách mặc định). */
    public List<TicketDtos.Assignee> handlers(Long buildingId) {
        return findHandlers(buildingId).stream().map(mapper::toAssignee).toList();
    }

    List<AppUser> findHandlers(Long buildingId) {
        return users.findHandlers(HANDLER_PERMISSION, buildingId, UserStatus.ACTIVE);
    }

    boolean isHandler(Long userId, Long buildingId) {
        return findHandlers(buildingId).stream().anyMatch(u -> u.getId().equals(userId));
    }

    @Transactional
    public TicketDtos.CategoryResponse create(TicketDtos.CategoryRequest req) {
        if (categories.existsByNameIgnoreCase(req.name().trim())) {
            throw duplicateName();
        }
        TicketCategory category = new TicketCategory();
        apply(category, req);
        categories.saveAndFlush(category);
        entityManager.refresh(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public TicketDtos.CategoryResponse update(Long id, TicketDtos.CategoryRequest req) {
        TicketCategory category = require(id);
        if (req.version() == null || !Objects.equals(category.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (categories.existsByNameIgnoreCaseAndIdNot(req.name().trim(), id)) {
            throw duplicateName();
        }
        apply(category, req);
        categories.saveAndFlush(category);
        entityManager.refresh(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public TicketDtos.CategoryResponse changeStatus(Long id, ActiveStatus status) {
        TicketCategory category = require(id);
        category.setStatus(status);
        categories.saveAndFlush(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public void delete(Long id) {
        TicketCategory category = require(id);
        if (category.getTicketCount() > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Danh mục đang có " + category.getTicketCount() + " yêu cầu, hãy chuyển sang Ngừng hoạt động.");
        }
        categories.delete(category);
    }

    TicketCategory require(Long id) {
        return categories.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy danh mục yêu cầu."));
    }

    private void apply(TicketCategory category, TicketDtos.CategoryRequest req) {
        if (req.resolutionSlaHours() < req.responseSlaHours()) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "resolutionSlaHours",
                    "SLA xử lý phải lớn hơn hoặc bằng SLA phản hồi.");
        }
        if (req.defaultAssigneeId() != null && !req.defaultAssigneeId().equals(category.getDefaultAssigneeId())
                && !isHandler(req.defaultAssigneeId(), null)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "defaultAssigneeId",
                    "Người phụ trách phải là người dùng đang hoạt động có quyền xử lý yêu cầu.");
        }
        category.setName(req.name().trim());
        category.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        category.setResponseSlaHours(req.responseSlaHours());
        category.setResolutionSlaHours(req.resolutionSlaHours());
        category.setDefaultAssigneeId(req.defaultAssigneeId());
        category.setStatus(req.status());
    }

    private static BusinessException duplicateName() {
        return BusinessException.field(ErrorCode.CONFLICT, "name", "Tên danh mục yêu cầu đã tồn tại.");
    }
}
