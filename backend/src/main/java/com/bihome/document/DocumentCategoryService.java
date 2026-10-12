package com.bihome.document;

import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.document.dto.DocumentDtos;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Danh mục tài liệu dùng chung cho mọi tòa; đang có tài liệu thì chỉ cho chuyển Ngừng hoạt động. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentCategoryService {

    private static final Sort DEFAULT_SORT = Sort.by("name");
    private static final Set<String> SORTABLE = Set.of("name", "documentCount", "createdAt", "updatedAt");

    private final DocumentCategoryRepository categories;
    private final DocumentMapper mapper;

    public PageResponse<DocumentDtos.CategoryResponse> list(DocumentDtos.CategoryFilter filter, PageParams pageParams) {
        return PageResponse.of(categories.findAll(DocumentSpecifications.categories(filter),
                pageParams.toPageable(DEFAULT_SORT, SORTABLE)), mapper::toResponse);
    }

    public List<DocumentDtos.CategoryOption> options() {
        return categories.findByStatusOrderByNameAsc(ActiveStatus.ACTIVE).stream().map(mapper::toOption).toList();
    }

    public DocumentDtos.CategoryResponse get(Long id) {
        return mapper.toResponse(require(id));
    }

    @Transactional
    public DocumentDtos.CategoryResponse create(DocumentDtos.CategoryRequest req) {
        if (categories.existsByNameIgnoreCase(req.name().trim())) {
            throw duplicateName();
        }
        DocumentCategory category = new DocumentCategory();
        apply(category, req);
        categories.saveAndFlush(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public DocumentDtos.CategoryResponse update(Long id, DocumentDtos.CategoryRequest req) {
        DocumentCategory category = require(id);
        if (req.version() == null || !Objects.equals(category.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        if (categories.existsByNameIgnoreCaseAndIdNot(req.name().trim(), id)) {
            throw duplicateName();
        }
        apply(category, req);
        categories.saveAndFlush(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public DocumentDtos.CategoryResponse changeStatus(Long id, ActiveStatus status) {
        DocumentCategory category = require(id);
        category.setStatus(status);
        categories.saveAndFlush(category);
        return mapper.toResponse(category);
    }

    @Transactional
    public void delete(Long id) {
        DocumentCategory category = require(id);
        if (category.getDocumentCount() > 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Danh mục đang có " + category.getDocumentCount() + " tài liệu, hãy chuyển sang Ngừng hoạt động.");
        }
        categories.delete(category);
    }

    DocumentCategory require(Long id) {
        return categories.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy danh mục tài liệu."));
    }

    private static void apply(DocumentCategory category, DocumentDtos.CategoryRequest req) {
        category.setName(req.name().trim());
        category.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        category.setColor(req.color().toUpperCase(Locale.ROOT));
        category.setStatus(req.status());
    }

    private static BusinessException duplicateName() {
        return BusinessException.field(ErrorCode.CONFLICT, "name", "Tên danh mục tài liệu đã tồn tại.");
    }
}
