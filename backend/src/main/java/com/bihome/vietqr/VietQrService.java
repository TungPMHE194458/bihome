package com.bihome.vietqr;

import com.bihome.building.Building;
import com.bihome.building.BuildingService;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.security.BuildingContext;
import com.bihome.feenotice.FeeNotice;
import com.bihome.feenotice.dto.FeeNoticeDtos;
import com.bihome.vietqr.dto.VietQrDtos;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cấu hình tài khoản VietQR theo tòa và chuỗi QR cho thông báo phí. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VietQrService {

    static final String SAMPLE_CODE = "TB-261001-001";

    private final VietQrConfigRepository configs;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;

    @Value("${bihome.bank-webhook.simulation-enabled:false}")
    private boolean simulationEnabled;

    public VietQrDtos.Response get() {
        Building building = buildingService.findAccessible(buildingContext.requireBuildingId());
        return toResponse(building, configs.findById(building.getId()).orElse(null));
    }

    @Transactional
    public VietQrDtos.Response update(VietQrDtos.Request req) {
        Building building = buildingService.requireActive(buildingContext.requireBuildingId(),
                "Tòa nhà đã ngừng hoạt động, không sửa được cấu hình.");
        VietQrConfig config = configs.findById(building.getId()).orElse(null);
        if (config == null ? req.version() != null : !Objects.equals(config.getVersion(), req.version())) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
        String template = req.contentTemplate().trim();
        if (!template.contains(VietQrConfig.CODE_PLACEHOLDER)) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "contentTemplate",
                    "Mẫu nội dung phải có " + VietQrConfig.CODE_PLACEHOLDER + " để đối soát tự động.");
        }
        if (VietQrPayload.sanitize(template.replace(VietQrConfig.CODE_PLACEHOLDER, SAMPLE_CODE)).length()
                >= VietQrPayload.MAX_CONTENT) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "contentTemplate",
                    "Mẫu nội dung quá dài: nhiều ngân hàng chỉ giữ " + VietQrPayload.MAX_CONTENT + " ký tự.");
        }
        if (config == null) {
            config = new VietQrConfig();
            config.setBuildingId(building.getId());
        }
        config.setBankBin(req.bankBin());
        config.setAccountNo(req.accountNo().toUpperCase(Locale.ROOT));
        config.setAccountName(accountName(req.accountName()));
        config.setContentTemplate(template);
        config.setEnabled(req.enabled());
        return toResponse(building, configs.saveAndFlush(config));
    }

    /** Cấu hình đang bật của tòa (dùng cho QR / PDF). */
    public Optional<VietQrConfig> enabledFor(Long buildingId) {
        return configs.findById(buildingId).filter(VietQrConfig::isEnabled);
    }

    /** QR cho số còn nợ của thông báo; không có cấu hình / không còn nợ thì rỗng. */
    public Optional<FeeNoticeDtos.VietQr> qrFor(FeeNotice notice) {
        BigDecimal amount = notice.outstanding();
        if (amount.signum() <= 0) {
            return Optional.empty();
        }
        return enabledFor(notice.getBuildingId()).map(c -> {
            String content = c.transferContent(notice.getCode());
            return new FeeNoticeDtos.VietQr(VietQrPayload.build(c.getBankBin(), c.getAccountNo(), amount, content),
                    c.getBankBin(), c.getAccountNo(), c.getAccountName(), amount, content);
        });
    }

    public boolean isSimulationEnabled() {
        return simulationEnabled;
    }

    /** Tên chủ tài khoản theo cách ngân hàng hiển thị: bỏ dấu, viết hoa. */
    static String accountName(String name) {
        return Normalizer.normalize(name.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private VietQrDtos.Response toResponse(Building building, VietQrConfig c) {
        String path = "/api/v1/webhooks/bank";
        if (c == null) {
            return new VietQrDtos.Response(building.getId(), building.getName(), null, null, null,
                    VietQrConfig.DEFAULT_TEMPLATE, false, VietQrPayload.sanitize(
                    VietQrConfig.DEFAULT_TEMPLATE.replace(VietQrConfig.CODE_PLACEHOLDER, SAMPLE_CODE)), path,
                    simulationEnabled, null);
        }
        return new VietQrDtos.Response(building.getId(), building.getName(), c.getBankBin(), c.getAccountNo(),
                c.getAccountName(), c.getContentTemplate(), c.isEnabled(), c.transferContent(SAMPLE_CODE), path,
                simulationEnabled, c.getVersion());
    }
}
