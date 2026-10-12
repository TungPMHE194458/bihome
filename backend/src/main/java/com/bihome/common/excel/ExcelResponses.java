package com.bihome.common.excel;

import java.nio.charset.StandardCharsets;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

public final class ExcelResponses {

    private ExcelResponses() {
    }

    public static ResponseEntity<byte[]> attachment(byte[] content, String fileName) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(ExcelWriter.CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName, StandardCharsets.UTF_8).build().toString())
                .body(content);
    }
}
