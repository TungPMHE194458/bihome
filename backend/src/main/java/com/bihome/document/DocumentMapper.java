package com.bihome.document;

import com.bihome.common.storage.FileAttachment;
import com.bihome.document.dto.DocumentDtos;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class DocumentMapper {

    public DocumentDtos.CategoryResponse toResponse(DocumentCategory c) {
        return new DocumentDtos.CategoryResponse(c.getId(), c.getName(), c.getDescription(), c.getColor(), c.getStatus(),
                c.getDocumentCount(), c.getCreatedAt(), c.getUpdatedAt(), c.getCreatedBy(), c.getUpdatedBy(),
                c.getVersion());
    }

    public DocumentDtos.CategoryOption toOption(DocumentCategory c) {
        return new DocumentDtos.CategoryOption(c.getId(), c.getName(), c.getColor(), c.getStatus());
    }

    public DocumentDtos.Response toResponse(Document d) {
        FileAttachment file = d.getFile();
        DocumentCategory category = d.getCategory();
        List<String> tags = d.getTags().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
        return new DocumentDtos.Response(d.getId(), d.getBuildingId(), d.getBuilding().getCode(), d.getBuilding().getName(),
                d.getCode(), d.getName(), d.getDescription(), d.getCategoryId(), category.getName(), category.getColor(),
                d.getAudience(), tags, file.getOriginalName(), file.getFileSize(), file.getContentType(),
                d.getFileVersionNo(), d.getCreatedAt(), d.getUpdatedAt(), d.getCreatedBy(), d.getUpdatedBy(),
                d.getVersion());
    }

    /** Phiên bản hiện tại trước, sau đó các bản cũ mới nhất trước. */
    public List<DocumentDtos.FileVersion> toVersions(Document d) {
        List<DocumentDtos.FileVersion> result = new ArrayList<>();
        FileAttachment current = d.getFile();
        result.add(new DocumentDtos.FileVersion(null, d.getFileVersionNo(), true, current.getOriginalName(),
                current.getFileSize(), current.getContentType(), current.getCreatedAt(), current.getCreatedBy(), null,
                null, null));
        d.getVersions().stream()
                .sorted(Comparator.comparingInt(DocumentFileVersion::getVersionNo).reversed())
                .forEach(v -> {
                    FileAttachment f = v.getFile();
                    result.add(new DocumentDtos.FileVersion(v.getId(), v.getVersionNo(), false, f.getOriginalName(),
                            f.getFileSize(), f.getContentType(), f.getCreatedAt(), f.getCreatedBy(), v.getCreatedAt(),
                            v.getCreatedBy(), v.getNote()));
                });
        return result;
    }
}
