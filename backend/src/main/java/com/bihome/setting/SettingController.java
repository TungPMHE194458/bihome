package com.bihome.setting;

import com.bihome.setting.dto.SettingDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Cấu hình chung")
@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingController {

    private final SettingService settingService;

    @Operation(summary = "Xem cấu hình chung")
    @GetMapping
    @PreAuthorize("hasAuthority('SETTING_READ')")
    public SettingDtos.Response get() {
        return settingService.get();
    }

    @Operation(summary = "Lưu cấu hình chung", description = "Áp dụng ngay cho đăng nhập, PDF và email thông báo phí.")
    @PutMapping
    @PreAuthorize("hasAuthority('SETTING_WRITE')")
    public SettingDtos.Response update(@Valid @RequestBody SettingDtos.Request request) {
        return settingService.update(request);
    }
}
