package com.bihome.common.storage;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.AuthUser;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Kiểm tra danh sách ảnh gửi lên cho một entity:
 * đúng mục đích tệp, ảnh mới thêm phải do chính người dùng tải lên, không trùng, tối đa một ảnh đại diện
 * (không chọn → ảnh đầu tiên là ảnh đại diện).
 */
@Component
public class ImageListResolver {

    private final FileAttachmentRepository files;
    private final FileReferences references;

    public ImageListResolver(FileAttachmentRepository files, FileReferences references) {
        this.files = files;
        this.references = references;
    }

    /** Trả về danh sách mới (không sửa {@code existing}) để gán đè vào collection của entity. */
    public List<EntityImage> resolve(List<ImageRef> refs, List<EntityImage> existing, FilePurpose purpose,
                                     AuthUser actor) {
        if (refs == null || refs.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> ids = refs.stream().map(ImageRef::fileId).toList();
        if (new HashSet<>(ids).size() != ids.size()) {
            throw invalid("Ảnh bị trùng lặp.");
        }
        long covers = refs.stream().filter(ImageRef::cover).count();
        if (covers > 1) {
            throw invalid("Chỉ được chọn một ảnh đại diện.");
        }

        Set<Long> alreadyAttached = existing.stream().map(EntityImage::getFileId).collect(Collectors.toSet());
        Map<Long, FileAttachment> found = files.findAllById(ids).stream()
                .collect(Collectors.toMap(FileAttachment::getId, Function.identity()));
        for (Long fileId : ids) {
            FileAttachment file = found.get(fileId);
            // Ảnh mới: phải do chính người thao tác tải lên và chưa gắn vào bản ghi nào khác.
            boolean valid = file != null && file.getPurpose() == purpose
                    && (alreadyAttached.contains(fileId)
                    || actor.username().equals(file.getCreatedBy()) && !references.isReferenced(fileId));
            if (!valid) {
                throw invalid("Ảnh không hợp lệ.");
            }
        }

        List<EntityImage> result = new ArrayList<>();
        for (int i = 0; i < refs.size(); i++) {
            result.add(new EntityImage(refs.get(i).fileId(), covers == 0 ? i == 0 : refs.get(i).cover()));
        }
        return result;
    }

    private static BusinessException invalid(String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, "images", message);
    }
}
