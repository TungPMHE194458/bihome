package com.bihome.common.storage;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Ảnh gửi lên trong request: tệp đã tải lên /files + có phải ảnh đại diện không. */
public record ImageRef(@NotNull(message = "Thiếu mã ảnh") @Positive Long fileId, boolean cover) {
}
