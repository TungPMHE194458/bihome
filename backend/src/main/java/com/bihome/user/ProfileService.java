package com.bihome.user;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.AuthUser;
import com.bihome.common.storage.FileAttachmentRepository;
import com.bihome.common.storage.FilePurpose;
import com.bihome.common.util.PhoneNumbers;
import com.bihome.user.dto.MeResponse;
import com.bihome.user.dto.ProfileUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProfileService {

    private final AppUserRepository users;
    private final FileAttachmentRepository files;
    private final UserMapper mapper;

    public MeResponse get(AuthUser me) {
        return mapper.toMe(find(me), me);
    }

    @Transactional
    public MeResponse update(AuthUser me, ProfileUpdateRequest req) {
        AppUser user = find(me);
        String phone = PhoneNumbers.normalize(req.phone());
        if (phone != null && users.existsByPhoneAndIdNot(phone, user.getId())) {
            throw BusinessException.field(ErrorCode.CONFLICT, "phone", "Số điện thoại đã được sử dụng.");
        }
        user.setPhone(phone);
        UserProfile profile = user.getProfile();
        profile.setFullName(req.fullName().trim());
        profile.setGender(req.gender());
        profile.setDateOfBirth(req.dateOfBirth());
        profile.setJobTitle(trimToNull(req.jobTitle()));
        profile.setDepartment(trimToNull(req.department()));
        profile.setAddress(trimToNull(req.address()));
        profile.setBio(trimToNull(req.bio()));
        users.saveAndFlush(user);
        return mapper.toMe(user, me);
    }

    /** Chỉ nhận ảnh mục đích AVATAR do chính user tải lên, tránh gán tệp của người khác. */
    @Transactional
    public MeResponse changeAvatar(AuthUser me, Long fileId) {
        AppUser user = find(me);
        if (fileId != null) {
            boolean valid = files.findById(fileId)
                    .filter(f -> f.getPurpose() == FilePurpose.AVATAR)
                    .filter(f -> me.username().equals(f.getCreatedBy()))
                    .isPresent();
            if (!valid) {
                throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "fileId", "Ảnh đại diện không hợp lệ.");
            }
        }
        user.getProfile().setAvatarFileId(fileId);
        users.saveAndFlush(user);
        return mapper.toMe(user, me);
    }

    private AppUser find(AuthUser me) {
        return users.findById(me.id()).orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng."));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
