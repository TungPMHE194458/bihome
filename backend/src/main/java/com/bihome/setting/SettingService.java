package com.bihome.setting;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.setting.dto.SettingDtos;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Cấu hình chung. Bản đọc được giữ trong bộ nhớ (đăng nhập, PDF đọc mỗi lần) và làm mới sau khi lưu thành công.
 */
@Service
@RequiredArgsConstructor
public class SettingService {

    /** Ảnh chụp chỉ đọc của cấu hình hiện hành. */
    public record Snapshot(String companyName, String taxCode, String address, String hotline, String email,
                           String website, String documentFooter, int maxFailedLogins, int lockMinutes,
                           boolean feeNoticeEmail) {
    }

    private final SystemSettingRepository settings;
    private volatile Snapshot cached;

    @Transactional(readOnly = true)
    public SettingDtos.Response get() {
        return toResponse(load());
    }

    /** Cấu hình hiện hành (đọc từ bộ nhớ). */
    public Snapshot current() {
        Snapshot s = cached;
        if (s == null) {
            s = snapshot(load());
            cached = s;
        }
        return s;
    }

    @Transactional
    public SettingDtos.Response update(SettingDtos.Request req) {
        SystemSetting s = load();
        if (!Objects.equals(s.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        s.setCompanyName(trim(req.companyName()));
        s.setTaxCode(trim(req.taxCode()));
        s.setAddress(trim(req.address()));
        s.setHotline(trim(req.hotline()));
        s.setEmail(trim(req.email()) == null ? null : req.email().trim().toLowerCase());
        s.setWebsite(trim(req.website()));
        s.setDocumentFooter(trim(req.documentFooter()));
        s.setMaxFailedLogins(req.maxFailedLogins());
        s.setLockMinutes(req.lockMinutes());
        s.setFeeNoticeEmail(req.feeNoticeEmail());
        settings.saveAndFlush(s);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    cached = null;
                }
            });
        } else {
            cached = null;
        }
        return toResponse(s);
    }

    private SystemSetting load() {
        // Dòng mặc định do migration tạo; thiếu (DB lạ) thì dùng giá trị mặc định chưa lưu.
        return settings.findById(SystemSetting.SINGLETON_ID).orElseGet(SystemSetting::new);
    }

    private static Snapshot snapshot(SystemSetting s) {
        return new Snapshot(s.getCompanyName(), s.getTaxCode(), s.getAddress(), s.getHotline(), s.getEmail(),
                s.getWebsite(), s.getDocumentFooter(), s.getMaxFailedLogins(), s.getLockMinutes(), s.isFeeNoticeEmail());
    }

    private static SettingDtos.Response toResponse(SystemSetting s) {
        return new SettingDtos.Response(s.getCompanyName(), s.getTaxCode(), s.getAddress(), s.getHotline(), s.getEmail(),
                s.getWebsite(), s.getDocumentFooter(), s.getMaxFailedLogins(), s.getLockMinutes(), s.isFeeNoticeEmail(),
                s.getUpdatedAt(), s.getUpdatedBy(), s.getVersion());
    }

    private static String trim(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
