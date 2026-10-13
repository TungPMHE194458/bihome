package com.bihome.document;

import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.document.dto.DocumentDtos;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tài liệu thuộc phạm vi tòa nhà. Mã tự sinh số tăng dần nếu bỏ trống; danh mục mới chọn phải đang hoạt động;
 * thay tệp thì tệp cũ được lưu lại thành một phiên bản.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {

    static final int MAX_CODE_NUMBER = 999_999_999;
    private static final int TAG_SUGGESTIONS = 20;
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");
    private static final Map<String, String> SORTS = Map.of(
            "code", "code",
            "name", "name",
            "categoryName", "category.name",
            "fileSize", "file.fileSize",
            "buildingName", "building.name",
            "createdAt", "createdAt",
            "updatedAt", "updatedAt");

    private final DocumentRepository documents;
    private final DocumentFileVersionRepository versions;
    private final DocumentCategoryService categoryService;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final FileService fileService;
    private final DocumentMapper mapper;
    private final EntityManager entityManager;

    public PageResponse<DocumentDtos.Response> list(DocumentDtos.Filter filter, PageParams pageParams) {
        return PageResponse.of(documents.findAll(
                        DocumentSpecifications.documents(filter, buildingService.listScope(filter.buildingId())),
                        pageParams.toPageable(DEFAULT_SORT, SORTS)),
                mapper::toResponse);
    }

    /** Gợi ý thẻ đã dùng trong phạm vi tòa như danh sách. */
    public List<String> tags(String keyword) {
        String pattern = keyword == null || keyword.isBlank() ? "%" : SpecificationBuilder.likePattern(keyword);
        PageRequest limit = PageRequest.of(0, TAG_SUGGESTIONS);
        Optional<Set<Long>> scope = buildingService.listScope(null);
        if (scope.isEmpty()) {
            return documents.findAllTags(pattern, limit);
        }
        return scope.get().isEmpty() ? List.of() : documents.findTags(scope.get(), pattern, limit);
    }

    public DocumentDtos.Response get(Long id) {
        return mapper.toResponse(requireAccessible(id));
    }

    /** App cư dân: tài liệu của tòa dành cho các nhóm đối tượng cư dân được xem (Tất cả cư dân / Chủ sở hữu / Người thuê). */
    public PageResponse<DocumentDtos.Response> listForAudiences(Long buildingId, Set<DocumentAudience> audiences,
                                                                PageParams pageParams) {
        Specification<Document> spec = (root, q, cb) -> cb.and(cb.equal(root.get("buildingId"), buildingId),
                root.get("audience").in(audiences));
        return PageResponse.of(documents.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORTS)), mapper::toResponse);
    }

    public List<DocumentDtos.FileVersion> fileVersions(Long id) {
        return mapper.toVersions(requireAccessible(id));
    }

    public FileService.FileContent content(Long id) {
        return fileService.get(requireAccessible(id).getFileId());
    }

    public FileService.FileContent versionContent(Long id, Long versionId) {
        Document document = requireAccessible(id);
        DocumentFileVersion version = document.getVersions().stream().filter(v -> v.getId().equals(versionId))
                .findFirst().orElseThrow(() -> new NotFoundException("Không tìm thấy phiên bản tệp."));
        return fileService.get(version.getFileId());
    }

    /** Thêm vào tòa đang chọn ở header. */
    @Transactional
    public DocumentDtos.Response create(DocumentDtos.Request req, AuthUser actor) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể thêm tài liệu.");
        if (req.fileId() == null) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "fileId", "Vui lòng chọn tệp tài liệu.");
        }
        requireNewFile(req.fileId(), actor);

        Document document = new Document();
        document.setBuildingId(buildingId);
        document.setCode(resolveCode(buildingId, req.code(), null));
        document.setFileId(req.fileId());
        apply(document, req);
        documents.saveAndFlush(document);
        // Nạp lại để có building/category/file (chỉ đọc) cho response.
        entityManager.refresh(document);
        return mapper.toResponse(document);
    }

    /** Sửa thông tin; tệp đổi qua {@link #replaceFile}. */
    @Transactional
    public DocumentDtos.Response update(Long id, DocumentDtos.Request req) {
        Document document = requireAccessible(id);
        requireVersion(document, req.version());
        document.setCode(resolveCode(document.getBuildingId(), req.code(), document));
        apply(document, req);
        documents.saveAndFlush(document);
        entityManager.refresh(document);
        return mapper.toResponse(document);
    }

    /** Tệp hiện tại thành phiên bản cũ; tệp mới là phiên bản kế tiếp. */
    @Transactional
    public DocumentDtos.Response replaceFile(Long id, DocumentDtos.ReplaceFileRequest req, AuthUser actor) {
        Document document = requireAccessible(id);
        requireVersion(document, req.version());
        requireNewFile(req.fileId(), actor);

        DocumentFileVersion old = new DocumentFileVersion();
        old.setDocument(document);
        old.setVersionNo(document.getFileVersionNo());
        old.setFileId(document.getFileId());
        old.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        document.getVersions().add(old);
        document.setFileId(req.fileId());
        document.setFileVersionNo(document.getFileVersionNo() + 1);
        documents.saveAndFlush(document);
        entityManager.refresh(document);
        return mapper.toResponse(document);
    }

    /** Xoá tài liệu cùng mọi phiên bản; tệp vật lý được xoá sau khi commit. */
    @Transactional
    public void delete(Long id) {
        Document document = requireAccessible(id);
        List<Long> fileIds = new ArrayList<>();
        fileIds.add(document.getFileId());
        document.getVersions().forEach(v -> fileIds.add(v.getFileId()));
        documents.delete(document);
        documents.flush();
        fileService.deleteAll(fileIds);
    }

    // ---------------------------------------------------------------- Helpers

    /** Tài liệu phải thuộc tòa user được truy cập, nếu không → 404. */
    Document requireAccessible(Long id) {
        return documents.findById(id)
                .filter(d -> buildingService.canAccess(d.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài liệu."));
    }

    private void apply(Document document, DocumentDtos.Request req) {
        if (!req.categoryId().equals(document.getCategoryId())) {
            DocumentCategory category = categoryService.require(req.categoryId());
            if (category.getStatus() != ActiveStatus.ACTIVE) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "categoryId", "Danh mục đang ngừng hoạt động.");
            }
            document.setCategoryId(category.getId());
        }
        document.setName(req.name().trim());
        document.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        document.setAudience(req.audience());
        document.setTags(normalizeTags(req.tags()));
    }

    /** Bỏ khoảng trắng thừa, bỏ thẻ trùng (không phân biệt hoa thường, giữ cách viết đầu tiên). */
    static Set<String> normalizeTags(List<String> tags) {
        Set<String> result = new LinkedHashSet<>();
        if (tags == null) {
            return result;
        }
        Set<String> seen = new HashSet<>();
        for (String tag : tags) {
            String t = tag == null ? "" : tag.trim().replaceAll("\\s+", " ");
            if (!t.isEmpty() && seen.add(t.toLowerCase(Locale.ROOT))) {
                result.add(t);
            }
        }
        return result;
    }

    /** Mã đã chuẩn hoá (in hoa); bỏ trống khi tạo = số kế tiếp, khi sửa = giữ mã cũ. */
    private String resolveCode(Long buildingId, String requested, Document existing) {
        String code = requested == null ? "" : requested.trim().toUpperCase(Locale.ROOT);
        if (code.isEmpty()) {
            if (existing != null) {
                return existing.getCode();
            }
            long max = Optional.ofNullable(documents.findMaxNumericCode(buildingId)).orElse(0L);
            if (max >= MAX_CODE_NUMBER) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "code", "Không tự sinh được mã, vui lòng nhập mã.");
            }
            return Long.toString(max + 1);
        }
        boolean taken = existing == null
                ? documents.existsByBuildingIdAndCode(buildingId, code)
                : documents.existsByBuildingIdAndCodeAndIdNot(buildingId, code, existing.getId());
        if (taken) {
            throw BusinessException.field(ErrorCode.CONFLICT, "code", "Mã tài liệu đã tồn tại trong tòa nhà này.");
        }
        return code;
    }

    private void requireNewFile(Long fileId, AuthUser actor) {
        if (documents.existsByFileId(fileId) || versions.existsByFileId(fileId)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "fileId", "Tệp đã được dùng cho tài liệu khác.");
        }
        fileService.requireOwnUpload(fileId, FilePurpose.DOCUMENT, actor, "fileId", "Tệp tài liệu không hợp lệ.");
    }

    private static void requireVersion(Document document, Long version) {
        if (version == null || !Objects.equals(document.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }
}
