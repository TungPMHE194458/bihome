package com.bihome.accesscard.dto;

import com.bihome.accesscard.AccessCardEnums.CardStatus;
import com.bihome.accesscard.AccessCardEnums.CardType;
import com.bihome.accesscard.AccessCardEnums.HistoryAction;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class AccessCardDtos {

    private AccessCardDtos() {
    }

    /**
     * Thêm / sửa thẻ. Khi thêm: có căn hộ → cấp luôn (Đang dùng), không → nhập kho. Khi sửa: thẻ Đang dùng / Khoá
     * đổi được căn, cư dân, xe (ghi lịch sử); thẻ Trong kho / Thu hồi không gắn ai; thẻ Báo mất giữ nguyên người gắn.
     */
    public record Request(
            @NotBlank(message = "Mã thẻ không được để trống")
            @Pattern(regexp = "^[A-Za-z0-9 -]{3,30}$", message = "Mã thẻ 3–30 ký tự, chỉ gồm chữ không dấu, chữ số và -")
            String cardNo,
            @NotNull(message = "Vui lòng chọn loại thẻ") CardType cardType,
            @Positive Long apartmentId,
            @Positive Long residentId,
            @Positive Long assetItemId,
            LocalDate issuedDate,
            LocalDate expiryDate,
            @NotNull(message = "Phí làm thẻ không được để trống")
            @DecimalMin(value = "0", message = "Phí làm thẻ không được âm")
            @DecimalMax(value = "999999999999", message = "Phí làm thẻ quá lớn")
            @Digits(integer = 12, fraction = 0, message = "Phí làm thẻ là số nguyên (VND)")
            BigDecimal issueFee,
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note,
            Long version) {
    }

    /** Cấp thẻ trong kho cho căn hộ (→ Đang dùng). */
    public record IssueRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") @Positive Long apartmentId,
            @Positive Long residentId,
            @Positive Long assetItemId,
            LocalDate issuedDate,
            LocalDate expiryDate,
            @DecimalMin(value = "0", message = "Phí làm thẻ không được âm")
            @Digits(integer = 12, fraction = 0, message = "Phí làm thẻ là số nguyên (VND)")
            BigDecimal issueFee,
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record StatusRequest(
            @NotNull(message = "Vui lòng chọn trạng thái") CardStatus status,
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    /** {@code expired=true}: chỉ thẻ đã quá ngày hết hạn. */
    public record Filter(
            String keyword,
            Long buildingId,
            String cardNo,
            CardType cardType,
            Long apartmentId,
            String apartment,
            Long residentId,
            String resident,
            Long assetItemId,
            CardStatus status,
            Boolean expired,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String cardNo,
            CardType cardType,
            Long apartmentId,
            String apartmentCode,
            String apartmentName,
            Long residentId,
            String residentName,
            Long assetItemId,
            String assetItemName,
            String plateNumber,
            LocalDate issuedDate,
            LocalDate expiryDate,
            boolean expired,
            BigDecimal issueFee,
            CardStatus status,
            String note,
            List<CardStatus> allowedStatuses,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            Long version) {
    }

    public record HistoryEntry(
            Long id,
            HistoryAction action,
            CardStatus fromStatus,
            CardStatus toStatus,
            String apartmentLabel,
            String residentName,
            String note,
            String actor,
            OffsetDateTime createdAt) {
    }
}
