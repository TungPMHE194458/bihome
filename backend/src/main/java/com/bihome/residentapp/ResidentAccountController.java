package com.bihome.residentapp;

import com.bihome.residentapp.dto.ResidentAuthDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Web BQL: tài khoản app của một cư dân. */
@Tag(name = "Cư dân – tài khoản app")
@RestController
@RequestMapping("/api/v1/residents/{residentId}/app-account")
@RequiredArgsConstructor
public class ResidentAccountController {

    private final ResidentAccountService service;

    @Operation(summary = "Thông tin tài khoản app", description = "404 nếu cư dân chưa có tài khoản.")
    @GetMapping
    @PreAuthorize("hasAuthority('RESIDENT_READ')")
    public ResidentAuthDtos.AccountResponse get(@PathVariable Long residentId) {
        return service.get(residentId);
    }

    @Operation(summary = "Tạo tài khoản app",
            description = "Đăng nhập bằng số điện thoại của cư dân; mật khẩu tạm chỉ trả một lần, lần đầu đăng nhập bắt đổi.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentAuthDtos.TemporaryPasswordResponse create(@PathVariable Long residentId) {
        return service.create(residentId);
    }

    @Operation(summary = "Khoá tài khoản app", description = "Đăng xuất mọi thiết bị ngay.")
    @PostMapping("/lock")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentAuthDtos.AccountResponse lock(@PathVariable Long residentId) {
        return service.lock(residentId);
    }

    @Operation(summary = "Mở khoá tài khoản app")
    @PostMapping("/unlock")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentAuthDtos.AccountResponse unlock(@PathVariable Long residentId) {
        return service.unlock(residentId);
    }

    @Operation(summary = "Đặt lại mật khẩu app", description = "Mật khẩu tạm mới (trả một lần); đăng xuất mọi thiết bị.")
    @PostMapping("/reset-password")
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public ResidentAuthDtos.TemporaryPasswordResponse resetPassword(@PathVariable Long residentId) {
        return service.resetPassword(residentId);
    }

    @Operation(summary = "Xoá tài khoản app")
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('RESIDENT_WRITE')")
    public void delete(@PathVariable Long residentId) {
        service.delete(residentId);
    }
}
