package com.bihome.common.storage;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DetectedFileType {
    JPEG("image/jpeg", "jpg", true),
    PNG("image/png", "png", true),
    WEBP("image/webp", "webp", true),
    PDF("application/pdf", "pdf", false),
    DOC("application/msword", "doc", false),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx", false),
    XLS("application/vnd.ms-excel", "xls", false),
    XLSX("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx", false),
    PPT("application/vnd.ms-powerpoint", "ppt", false),
    PPTX("application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx", false);

    private final String contentType;
    private final String extension;
    private final boolean image;
}
