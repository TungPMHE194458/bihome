package com.bihome.residentapp;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentEnums.AppAccountStatus;
import com.bihome.resident.ResidentService;
import com.bihome.residentapp.dto.ResidentAuthDtos;
import com.bihome.user.TemporaryPasswordGenerator;
import java.time.Clock;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BQL cấp / khoá / mở khoá / đặt lại tài khoản app của cư dân (màn hình Cư dân). Đồng bộ
 * {@code RESIDENT.APP_ACCOUNT_STATUS} để lọc danh sách cư dân theo trạng thái tài khoản app.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResidentAccountService {

    private final ResidentAccountRepository accounts;
    private final ResidentRefreshTokenRepository refreshTokens;
    private final ResidentService residentService;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator passwordGenerator;
    private final Clock clock;

    public ResidentAuthDtos.AccountResponse get(Long residentId) {
        residentService.requireAccessible(residentId);
        return toResponse(requireAccount(residentId));
    }

    @Transactional
    public ResidentAuthDtos.TemporaryPasswordResponse create(Long residentId) {
        Resident resident = residentService.requireAccessible(residentId);
        if (accounts.findByResidentId(residentId).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Cư dân đã có tài khoản app.");
        }
        if (resident.activeLinks().isEmpty()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Cư dân đã chuyển đi khỏi mọi căn hộ, không tạo được tài khoản app.");
        }
        if (accounts.existsByPhone(resident.getPhone())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Số điện thoại " + resident.getPhone() + " đã được dùng cho tài khoản app của cư dân khác.");
        }
        String password = passwordGenerator.generate();
        ResidentAccount account = new ResidentAccount();
        account.setResidentId(residentId);
        account.setPhone(resident.getPhone());
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setStatus(ResidentAccount.Status.ACTIVE);
        account.setMustChangePassword(true);
        accounts.save(account);
        resident.setAppAccountStatus(AppAccountStatus.ACTIVE);
        return new ResidentAuthDtos.TemporaryPasswordResponse(account.getPhone(), password);
    }

    /** Khoá: đăng xuất mọi thiết bị ngay (token truy cập hiện có bị từ chối ở request kế tiếp). */
    @Transactional
    public ResidentAuthDtos.AccountResponse lock(Long residentId) {
        Resident resident = residentService.requireAccessible(residentId);
        ResidentAccount account = requireAccount(residentId);
        account.setStatus(ResidentAccount.Status.LOCKED);
        refreshTokens.revokeAll(account.getId(), OffsetDateTime.now(clock));
        resident.setAppAccountStatus(AppAccountStatus.LOCKED);
        return toResponse(account);
    }

    @Transactional
    public ResidentAuthDtos.AccountResponse unlock(Long residentId) {
        Resident resident = residentService.requireAccessible(residentId);
        ResidentAccount account = requireAccount(residentId);
        account.setStatus(ResidentAccount.Status.ACTIVE);
        account.setFailedLoginCount(0);
        account.setLockedUntil(null);
        resident.setAppAccountStatus(AppAccountStatus.ACTIVE);
        return toResponse(account);
    }

    /** Mật khẩu tạm mới, bắt đổi khi đăng nhập; đăng xuất mọi thiết bị. Số điện thoại đăng nhập cập nhật theo hồ sơ. */
    @Transactional
    public ResidentAuthDtos.TemporaryPasswordResponse resetPassword(Long residentId) {
        Resident resident = residentService.requireAccessible(residentId);
        ResidentAccount account = requireAccount(residentId);
        if (!resident.getPhone().equals(account.getPhone())) {
            accounts.findByPhone(resident.getPhone()).filter(other -> !other.getId().equals(account.getId()))
                    .ifPresent(other -> {
                        throw new BusinessException(ErrorCode.CONFLICT, "Số điện thoại " + resident.getPhone()
                                + " đã được dùng cho tài khoản app của cư dân khác.");
                    });
            account.setPhone(resident.getPhone());
        }
        String password = passwordGenerator.generate();
        OffsetDateTime now = OffsetDateTime.now(clock);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setMustChangePassword(true);
        account.setPasswordChangedAt(now);
        account.setFailedLoginCount(0);
        account.setLockedUntil(null);
        refreshTokens.revokeAll(account.getId(), now);
        return new ResidentAuthDtos.TemporaryPasswordResponse(account.getPhone(), password);
    }

    @Transactional
    public void delete(Long residentId) {
        Resident resident = residentService.requireAccessible(residentId);
        accounts.delete(requireAccount(residentId));
        resident.setAppAccountStatus(AppAccountStatus.NONE);
    }

    private ResidentAccount requireAccount(Long residentId) {
        return accounts.findByResidentId(residentId)
                .orElseThrow(() -> new NotFoundException("Cư dân chưa có tài khoản app."));
    }

    private static ResidentAuthDtos.AccountResponse toResponse(ResidentAccount a) {
        return new ResidentAuthDtos.AccountResponse(a.getResidentId(), a.getPhone(), a.getStatus(), a.isMustChangePassword(),
                a.getLastLoginAt(), a.getCreatedAt(), a.getCreatedBy());
    }
}
