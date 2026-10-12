package com.bihome.setting.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public final class SettingDtos {

    private SettingDtos() {
    }

    public record Request(
            @Size(max = 200, message = "Tên đơn vị tối đa 200 ký tự") String companyName,
            @Pattern(regexp = "^$|^\\d{10}(-\\d{3})?$", message = "Mã số thuế gồm 10 số (hoặc 10 số-3 số chi nhánh)")
            String taxCode,
            @Size(max = 300, message = "Địa chỉ tối đa 300 ký tự") String address,
            @Pattern(regexp = "^$|^[0-9+ .()-]{4,20}$", message = "Hotline không hợp lệ") String hotline,
            @Email(message = "Email không hợp lệ") @Size(max = 150, message = "Email tối đa 150 ký tự") String email,
            @Size(max = 150, message = "Website tối đa 150 ký tự") String website,
            @Size(max = 300, message = "Chân trang tối đa 300 ký tự") String documentFooter,
            @Min(value = 3, message = "Từ 3 đến 20 lần") @Max(value = 20, message = "Từ 3 đến 20 lần") int maxFailedLogins,
            @Min(value = 1, message = "Từ 1 đến 1440 phút") @Max(value = 1440, message = "Từ 1 đến 1440 phút") int lockMinutes,
            boolean feeNoticeEmail,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record Response(
            String companyName,
            String taxCode,
            String address,
            String hotline,
            String email,
            String website,
            String documentFooter,
            int maxFailedLogins,
            int lockMinutes,
            boolean feeNoticeEmail,
            OffsetDateTime updatedAt,
            String updatedBy,
            Long version) {
    }
}
