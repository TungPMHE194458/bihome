package com.bihome.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bihome.building.BuildingService;
import com.bihome.common.entity.ActiveStatus;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.AuthUser;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileService;
import com.bihome.document.dto.DocumentDtos;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    private static final AuthUser ME = new AuthUser(1L, "me", Set.of("BUILDING_MANAGER"), Set.of(), Set.of(5L), false, false);

    @Mock DocumentRepository documents;
    @Mock DocumentFileVersionRepository versions;
    @Mock DocumentCategoryService categoryService;
    @Mock BuildingService buildingService;
    @Mock BuildingContext buildingContext;
    @Mock FileService fileService;
    @Mock DocumentMapper mapper;
    @Mock EntityManager entityManager;

    @InjectMocks
    DocumentService service;

    DocumentCategory category;

    @BeforeEach
    void setUp() {
        category = new DocumentCategory();
        category.setId(3L);
        category.setStatus(ActiveStatus.ACTIVE);
        lenient().when(categoryService.require(3L)).thenReturn(category);
        lenient().when(buildingContext.requireBuildingId()).thenReturn(5L);
        lenient().when(buildingService.canAccess(5L)).thenReturn(true);
    }

    private static DocumentDtos.Request request(String code, List<String> tags, Long fileId) {
        return new DocumentDtos.Request(code, " Nội quy cư dân ", " ", 3L, DocumentAudience.ALL_RESIDENTS, tags, fileId,
                null);
    }

    private Document saved() {
        ArgumentCaptor<Document> captor = ArgumentCaptor.forClass(Document.class);
        verify(documents).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private Document existing() {
        Document d = new Document();
        d.setId(9L);
        d.setBuildingId(5L);
        d.setCode("7");
        d.setCategoryId(3L);
        d.setFileId(100L);
        d.setVersion(2L);
        when(documents.findById(9L)).thenReturn(Optional.of(d));
        return d;
    }

    @Test
    void createGeneratesTheNextNumberAndNormalizesTags() {
        when(documents.findMaxNumericCode(5L)).thenReturn(41L);

        service.create(request(" ", List.of(" nội  quy ", "Nội quy", "PCCC", " "), 100L), ME);

        Document d = saved();
        assertThat(d.getCode()).isEqualTo("42");
        assertThat(d.getBuildingId()).isEqualTo(5L);
        assertThat(d.getName()).isEqualTo("Nội quy cư dân");
        assertThat(d.getDescription()).isNull();
        assertThat(d.getTags()).containsExactly("nội quy", "PCCC");
        assertThat(d.getFileVersionNo()).isEqualTo(1);
        verify(fileService).requireOwnUpload(eq(100L), eq(FilePurpose.DOCUMENT), eq(ME), eq("fileId"), anyString());
    }

    @Test
    void firstGeneratedCodeIsOneAndCustomCodesAreUppercased() {
        service.create(request(null, List.of(), 100L), ME);
        assertThat(saved().getCode()).isEqualTo("1");
    }

    @Test
    void duplicateCodeIsAConflictOnTheCodeField() {
        when(documents.existsByBuildingIdAndCode(5L, "NQ-01")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request("nq-01", List.of(), 100L), ME))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
                    assertThat(e.getErrors().getFirst().field()).isEqualTo("code");
                });
    }

    @Test
    void createRequiresAFileThatIsNotUsedYet() {
        assertThatThrownBy(() -> service.create(request(null, List.of(), null), ME))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("fileId"));

        when(versions.existsByFileId(100L)).thenReturn(true);
        assertThatThrownBy(() -> service.create(request(null, List.of(), 100L), ME))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getMessage()).isEqualTo("Tệp đã được dùng cho tài liệu khác."));
        verify(documents, never()).saveAndFlush(any());
    }

    @Test
    void inactiveCategoryCannotBeChosenButCanBeKept() {
        category.setStatus(ActiveStatus.INACTIVE);
        assertThatThrownBy(() -> service.create(request(null, List.of(), 100L), ME))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrors().getFirst().field()).isEqualTo("categoryId"));

        existing();
        DocumentDtos.Request keep = new DocumentDtos.Request("7", "Tên mới", null, 3L, DocumentAudience.MANAGEMENT,
                List.of(), null, 2L);
        service.update(9L, keep);
        assertThat(saved().getAudience()).isEqualTo(DocumentAudience.MANAGEMENT);
    }

    @Test
    void updateKeepsTheCodeWhenLeftBlankAndChecksTheVersion() {
        Document d = existing();
        service.update(9L, new DocumentDtos.Request("", "Tên", null, 3L, DocumentAudience.OWNERS, null, null, 2L));
        assertThat(d.getCode()).isEqualTo("7");

        assertThatThrownBy(() -> service.update(9L,
                new DocumentDtos.Request("", "Tên", null, 3L, DocumentAudience.OWNERS, null, null, 1L)))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VERSION_CONFLICT));
    }

    @Test
    void replacingTheFileArchivesTheCurrentOneAsAVersion() {
        Document d = existing();

        service.replaceFile(9L, new DocumentDtos.ReplaceFileRequest(200L, " Cập nhật mức phí ", 2L), ME);

        assertThat(d.getFileId()).isEqualTo(200L);
        assertThat(d.getFileVersionNo()).isEqualTo(2);
        assertThat(d.getVersions()).singleElement().satisfies(v -> {
            assertThat(v.getFileId()).isEqualTo(100L);
            assertThat(v.getVersionNo()).isEqualTo(1);
            assertThat(v.getNote()).isEqualTo("Cập nhật mức phí");
        });
    }

    @Test
    void deletingRemovesTheCurrentAndArchivedFiles() {
        Document d = existing();
        DocumentFileVersion old = new DocumentFileVersion();
        old.setFileId(90L);
        d.getVersions().add(old);

        service.delete(9L);

        verify(documents).delete(d);
        verify(fileService).deleteAll(List.of(100L, 90L));
    }

    @Test
    void documentsOfOtherBuildingsAreNotFound() {
        Document d = existing();
        d.setBuildingId(6L);

        assertThatThrownBy(() -> service.get(9L)).hasMessage("Không tìm thấy tài liệu.");
    }

    @Test
    void tagNormalizationIsCaseInsensitive() {
        assertThat(DocumentService.normalizeTags(List.of("Biểu mẫu", "biểu MẪU", "  Hợp   đồng "))).containsExactly(
                "Biểu mẫu", "Hợp đồng");
        assertThat(DocumentService.normalizeTags(null)).isEmpty();
    }
}
