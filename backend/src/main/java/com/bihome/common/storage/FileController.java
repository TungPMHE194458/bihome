package com.bihome.common.storage;

import com.bihome.common.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Tệp đính kèm")
@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileService fileService;
    private final FileAccessPolicy accessPolicy;

    public FileController(FileService fileService, FileAccessPolicy accessPolicy) {
        this.fileService = fileService;
        this.accessPolicy = accessPolicy;
    }

    @Operation(summary = "Tải tệp lên", description = "Kiểm tra loại tệp thật bằng magic bytes. Ảnh ≤ 5MB, tài liệu ≤ 20MB.")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(@RequestParam("file") MultipartFile file,
                                               @RequestParam("purpose") FilePurpose purpose) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fileService.upload(file, purpose));
    }

    @Operation(summary = "Xem hoặc tải tệp", description = "Mặc định hiển thị trực tiếp với ảnh/PDF; download=true để tải về. "
            + "Chỉ người tải lên hoặc người được truy cập tòa của bản ghi chứa tệp mới xem được.")
    @GetMapping("/{id}")
    public ResponseEntity<Resource> get(@PathVariable Long id,
                                        @RequestParam(defaultValue = "false") boolean download,
                                        @AuthenticationPrincipal AuthUser user) {
        FileService.FileContent content = fileService.get(id);
        accessPolicy.requireReadable(content.attachment(), user);
        return FileContentResponses.of(content, download);
    }
}
