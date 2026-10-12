package com.bihome.common.storage;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import com.bihome.common.security.AuthUser;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@Transactional(readOnly = true)
public class FileService {

    private static final int MAX_NAME_LENGTH = 255;

    private final FileAttachmentRepository repository;
    private final StorageService storage;
    private final String publicBaseUrl;
    private final FileReferences references;

    public FileService(FileAttachmentRepository repository, StorageService storage,
                       @Value("${bihome.storage.public-base-url}") String publicBaseUrl, FileReferences references) {
        this.repository = repository;
        this.storage = storage;
        this.publicBaseUrl = publicBaseUrl;
        this.references = references;
    }

    public record FileContent(FileAttachment attachment, Resource resource) {
    }

    @Transactional
    public FileResponse upload(MultipartFile file, FilePurpose purpose) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.FILE_EMPTY);
        }
        if (file.getSize() > purpose.maxBytes()) {
            throw new BusinessException(ErrorCode.FILE_TOO_LARGE,
                    "Tệp vượt quá dung lượng tối đa " + (purpose.maxBytes() / (1024 * 1024)) + "MB.");
        }
        byte[] data = read(file);
        DetectedFileType type = FileTypeDetector.detect(data, file.getOriginalFilename())
                .filter(purpose::allows)
                .orElseThrow(() -> new BusinessException(ErrorCode.FILE_TYPE_NOT_ALLOWED));

        OffsetDateTime now = OffsetDateTime.now();
        String storedPath = "%s/%04d/%02d/%s.%s".formatted(purpose.name().toLowerCase(Locale.ROOT),
                now.getYear(), now.getMonthValue(), UUID.randomUUID(), type.getExtension());
        storage.store(storedPath, new ByteArrayInputStream(data));

        FileAttachment attachment = new FileAttachment();
        attachment.setOriginalName(sanitizeName(file.getOriginalFilename(), type));
        attachment.setStoredPath(storedPath);
        attachment.setFileSize(data.length);
        attachment.setContentType(type.getContentType());
        attachment.setPurpose(purpose);
        try {
            repository.saveAndFlush(attachment);
        } catch (RuntimeException e) {
            storage.delete(storedPath);
            throw e;
        }
        return toResponse(attachment);
    }

    public FileContent get(Long id) {
        FileAttachment attachment = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tệp."));
        return new FileContent(attachment, storage.load(attachment.getStoredPath()));
    }

    /**
     * Tệp mới gắn vào một bản ghi phải đúng mục đích và do chính người dùng tải lên (tránh gán tệp của người khác).
     * @param field tên trường báo lỗi
     */
    public FileAttachment requireOwnUpload(Long fileId, FilePurpose purpose, AuthUser actor, String field,
                                           String message) {
        // Tệp mới gắn: đúng mục đích, do chính người thao tác tải lên và chưa gắn vào bản ghi nào (kể cả của tòa khác —
        // gắn lại rồi gỡ sẽ xoá mất tệp của bản ghi kia).
        return repository.findById(fileId)
                .filter(f -> f.getPurpose() == purpose)
                .filter(f -> actor.username().equals(f.getCreatedBy()))
                .filter(f -> !references.isReferenced(f.getId()))
                .orElseThrow(() -> BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message));
    }

    /** Xoá bản ghi tệp ngay; tệp vật lý chỉ xoá sau khi transaction commit (rollback thì vẫn còn tệp). */
    @Transactional
    public void deleteAll(Collection<Long> ids) {
        List<FileAttachment> attachments = repository.findAllById(ids);
        if (attachments.isEmpty()) {
            return;
        }
        List<String> paths = attachments.stream().map(FileAttachment::getStoredPath).toList();
        repository.deleteAll(attachments);
        repository.flush();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteStored(paths);
                }
            });
        } else {
            deleteStored(paths);
        }
    }

    private void deleteStored(List<String> paths) {
        for (String path : paths) {
            try {
                storage.delete(path);
            } catch (RuntimeException e) {
                log.warn("Không xoá được tệp {}: {}", path, e.getMessage());
            }
        }
    }

    public FileResponse toResponse(FileAttachment a) {
        return new FileResponse(a.getId(), a.getOriginalName(), a.getFileSize(), a.getContentType(), urlFor(a.getId()));
    }

    public ImageResponse toImageResponse(EntityImage image) {
        return new ImageResponse(image.getFileId(), urlFor(image.getFileId()), image.isCover());
    }

    public String urlFor(Long fileId) {
        return publicBaseUrl + "/" + fileId;
    }

    private static byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.STORAGE_ERROR, "Không đọc được tệp tải lên.", e);
        }
    }

    private static String sanitizeName(String original, DetectedFileType type) {
        String name = original == null ? "" : original;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1)
                .replaceAll("\\p{Cntrl}", "").trim();
        if (name.isEmpty()) {
            name = "file." + type.getExtension();
        }
        return name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name;
    }
}
