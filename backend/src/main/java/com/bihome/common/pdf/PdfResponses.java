package com.bihome.common.pdf;

import java.nio.charset.StandardCharsets;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

public final class PdfResponses {

    private PdfResponses() {
    }

    /** PDF mở xem trong trình duyệt (vẫn tải về được với tên tệp gợi ý). */
    public static ResponseEntity<byte[]> inline(byte[] content, String fileName) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(fileName, StandardCharsets.UTF_8).build().toString())
                .body(content);
    }

    public static ResponseEntity<byte[]> png(byte[] content) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).cacheControl(CacheControl.noStore()).body(content);
    }
}
