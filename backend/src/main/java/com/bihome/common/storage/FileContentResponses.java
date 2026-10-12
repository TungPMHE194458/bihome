package com.bihome.common.storage;

import java.nio.charset.StandardCharsets;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Trả nội dung tệp: ảnh/PDF hiển thị trực tiếp (xem trước), loại khác hoặc {@code download=true} thì tải về. */
public final class FileContentResponses {

    private FileContentResponses() {
    }

    public static ResponseEntity<Resource> of(FileService.FileContent content, boolean download) {
        FileAttachment attachment = content.attachment();
        boolean inlineAllowed = attachment.getContentType().startsWith("image/")
                || attachment.getContentType().equals("application/pdf");
        ContentDisposition disposition = (inlineAllowed && !download
                ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(attachment.getOriginalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .contentLength(attachment.getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(content.resource());
    }
}
