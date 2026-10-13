package com.bihome.residentapp;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.storage.FileResponse;
import com.bihome.common.storage.FileService;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Tệp cho app cư dân. Tải lên: ảnh đính kèm yêu cầu, ảnh thành viên khi kê khai. Xem: tệp do chính cư dân tải lên;
 * ảnh tòa nhà / tiện ích / dịch vụ của tòa mình; ảnh căn hộ của mình; ảnh đại diện của mình và của người đang ở cùng
 * căn; ảnh trong phiếu kê khai của căn mình; tệp đính kèm yêu cầu của căn mình (trừ tệp ở bình luận nội bộ của BQL).
 * Không có quyền → 404 (không lộ tệp có tồn tại).
 */
@Service
@RequiredArgsConstructor
public class ResidentFileService {

    private static final Set<FilePurpose> UPLOADABLE = Set.of(FilePurpose.TICKET_ATTACHMENT, FilePurpose.RESIDENT_AVATAR);

    private static final String READABLE_SQL = """
            SELECT COUNT(*) FROM DUAL WHERE
               EXISTS (SELECT 1 FROM FILE_ATTACHMENT f WHERE f.ID = :fileId AND f.CREATED_BY = :actor)
            OR EXISTS (SELECT 1 FROM BUILDING_IMAGE i WHERE i.FILE_ID = :fileId AND i.BUILDING_ID = :buildingId)
            OR EXISTS (SELECT 1 FROM AMENITY_IMAGE i JOIN AMENITY a ON a.ID = i.AMENITY_ID
                       WHERE i.FILE_ID = :fileId AND a.BUILDING_ID = :buildingId)
            OR EXISTS (SELECT 1 FROM SERVICE_IMAGE i JOIN SERVICE s ON s.ID = i.SERVICE_ID
                       WHERE i.FILE_ID = :fileId AND s.BUILDING_ID = :buildingId)
            OR EXISTS (SELECT 1 FROM APARTMENT_IMAGE i WHERE i.FILE_ID = :fileId AND i.APARTMENT_ID IN (:apartmentIds))
            OR EXISTS (SELECT 1 FROM RESIDENT r WHERE r.AVATAR_FILE_ID = :fileId AND r.ID = :residentId)
            OR EXISTS (SELECT 1 FROM RESIDENT r JOIN APARTMENT_RESIDENT ar ON ar.RESIDENT_ID = r.ID
                       WHERE r.AVATAR_FILE_ID = :fileId AND ar.APARTMENT_ID IN (:apartmentIds)
                         AND ar.RESIDENCE_STATUS <> 'MOVED_OUT')
            OR EXISTS (SELECT 1 FROM RESIDENT_DECLARATION d WHERE d.PHOTO_FILE_ID = :fileId
                       AND d.APARTMENT_ID IN (:apartmentIds))
            OR EXISTS (SELECT 1 FROM TICKET_ATTACHMENT ta JOIN TICKET t ON t.ID = ta.TICKET_ID
                       LEFT JOIN TICKET_COMMENT c ON c.ID = ta.COMMENT_ID
                       WHERE ta.FILE_ID = :fileId AND t.APARTMENT_ID IN (:apartmentIds)
                         AND (ta.COMMENT_ID IS NULL OR c.VISIBILITY = 'PUBLIC'))
            """;

    private final FileService fileService;
    private final ResidentContext context;
    private final NamedParameterJdbcTemplate jdbc;

    public FileResponse upload(MultipartFile file, FilePurpose purpose) {
        if (!UPLOADABLE.contains(purpose)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Loại tệp tải lên không hợp lệ.");
        }
        return fileService.upload(file, purpose);
    }

    public FileService.FileContent get(Long fileId) {
        ResidentSession s = context.current();
        List<Long> apartmentIds = s.apartmentIds().isEmpty() ? List.of(-1L) : s.apartmentIds();
        Integer count = jdbc.queryForObject(READABLE_SQL, new MapSqlParameterSource()
                .addValue("fileId", fileId)
                .addValue("actor", s.actor().username())
                .addValue("buildingId", s.buildingId())
                .addValue("apartmentIds", apartmentIds)
                .addValue("residentId", s.residentId()), Integer.class);
        if (count == null || count == 0) {
            throw new NotFoundException("Không tìm thấy tệp.");
        }
        return fileService.get(fileId);
    }
}
