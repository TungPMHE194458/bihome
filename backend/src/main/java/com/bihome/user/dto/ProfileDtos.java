package com.bihome.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class ProfileDtos {

    private ProfileDtos() {
    }

    public record PinnedPage(
            @NotBlank(message = "Thiếu đường dẫn trang") @Size(max = 300, message = "Đường dẫn quá dài") String path,
            @NotBlank(message = "Thiếu tên trang") @Size(max = 150, message = "Tên trang tối đa 150 ký tự") String title) {
    }

    public record PinnedPagesRequest(@NotNull(message = "Thiếu danh sách trang") List<@Valid PinnedPage> pages) {
    }
}
