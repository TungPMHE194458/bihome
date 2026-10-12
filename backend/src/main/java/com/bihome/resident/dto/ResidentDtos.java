package com.bihome.resident.dto;

import com.bihome.common.util.PhoneNumbers;
import com.bihome.resident.ResidentEnums.AppAccountStatus;
import com.bihome.resident.ResidentEnums.IdDocumentType;
import com.bihome.resident.ResidentEnums.Relationship;
import com.bihome.resident.ResidentEnums.ResidenceStatus;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.user.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class ResidentDtos {

    private ResidentDtos() {
    }

    /**
     * Cư dân thuộc tòa của căn hộ đầu tiên được gán (không đổi tòa sau khi tạo).
     *
     * @param code       bỏ trống = tự sinh CD + 6 số
     * @param apartment  bắt buộc khi tạo mới (căn hộ đầu tiên); bỏ qua khi cập nhật — dùng API gán căn hộ / chuyển đi
     * @param version    bắt buộc khi cập nhật
     */
    public record Request(
            @Pattern(regexp = "^$|^[A-Za-z0-9._-]{1,20}$",
                    message = "Mã cư dân tối đa 20 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -")
            String code,

            @NotBlank(message = "Họ và tên không được để trống")
            @Size(max = 150, message = "Họ và tên tối đa 150 ký tự")
            String fullName,

            @NotBlank(message = "Số điện thoại không được để trống")
            @Pattern(regexp = PhoneNumbers.REGEX, message = PhoneNumbers.MESSAGE)
            String phone,

            @Email(message = "Email không đúng định dạng")
            @Size(max = 150, message = "Email tối đa 150 ký tự")
            String email,

            Gender gender,

            @PastOrPresent(message = "Ngày sinh không được sau hôm nay")
            LocalDate dateOfBirth,

            IdDocumentType idType,

            @Size(max = 20, message = "Số giấy tờ tối đa 20 ký tự")
            String idNumber,

            @PastOrPresent(message = "Ngày cấp không được sau hôm nay")
            LocalDate idIssueDate,

            @Size(max = 200, message = "Nơi cấp tối đa 200 ký tự")
            String idIssuePlace,

            @Size(max = 100, message = "Quốc tịch tối đa 100 ký tự")
            String nationality,

            @Positive Long avatarFileId,

            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
            String note,

            @Valid LinkRequest apartment,

            Long version) {
    }

    /**
     * Gắn cư dân với một căn hộ (hoặc sửa thông tin cư trú tại căn đó).
     *
     * @param apartmentId     không đổi được khi sửa
     * @param residenceStatus LIVING / TEMP_ABSENT; có ngày chuyển đi ≤ hôm nay → tự chuyển MOVED_OUT
     * @param version         bắt buộc khi sửa
     */
    public record LinkRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") @Positive Long apartmentId,

            @NotNull(message = "Vui lòng chọn vai trò tại căn hộ")
            ResidentRole role,

            Relationship relationship,

            boolean householdHead,

            @NotNull(message = "Ngày chuyển đến không được để trống")
            LocalDate moveInDate,

            LocalDate moveOutDate,

            ResidenceStatus residenceStatus,

            boolean tempResidenceRegistered,

            Long version) {
    }

    /** @param linkIds căn hộ chuyển đi; bỏ trống = chuyển đi khỏi mọi căn đang ở */
    public record MoveOutRequest(
            @NotNull(message = "Ngày chuyển đi không được để trống")
            @PastOrPresent(message = "Ngày chuyển đi không được sau hôm nay")
            LocalDate moveOutDate,

            List<@NotNull Long> linkIds) {
    }

    /**
     * Các điều kiện về căn hộ ({@code apartmentId, apartment, role, tempResidenceRegistered}) cùng áp lên một
     * lần cư trú còn hiệu lực (tìm theo cả lịch sử nếu lọc tình trạng "Đã chuyển đi").
     */
    public record Filter(
            String keyword,
            Long buildingId,
            Long apartmentId,
            String code,
            String fullName,
            String phone,
            String email,
            String apartment,
            ResidentRole role,
            ResidenceStatus residenceStatus,
            Boolean tempResidenceRegistered,
            AppAccountStatus appAccountStatus,
            LocalDate createdFrom,
            LocalDate createdTo,
            LocalDate updatedFrom,
            LocalDate updatedTo) {
    }

    /** Căn hộ đang ở, gọn cho danh sách. */
    public record LinkBrief(
            Long id,
            Long apartmentId,
            String apartmentCode,
            String apartmentName,
            ResidentRole role,
            boolean householdHead,
            ResidenceStatus residenceStatus) {
    }

    /** {@code idNumberMasked}: chỉ hiện 4 ký tự đầu và 3 ký tự cuối. */
    public record Summary(
            Long id,
            Long buildingId,
            String buildingCode,
            String buildingName,
            String code,
            String fullName,
            String phone,
            String email,
            Gender gender,
            LocalDate dateOfBirth,
            IdDocumentType idType,
            String idNumberMasked,
            String avatarUrl,
            List<LinkBrief> apartments,
            ResidenceStatus residenceStatus,
            boolean tempResidenceRegistered,
            AppAccountStatus appAccountStatus,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
    }

    public record LinkResponse(
            Long id,
            Long residentId,
            Long apartmentId,
            String apartmentCode,
            String apartmentName,
            ResidentRole role,
            Relationship relationship,
            boolean householdHead,
            LocalDate moveInDate,
            LocalDate moveOutDate,
            ResidenceStatus residenceStatus,
            boolean tempResidenceRegistered,
            Long version) {
    }

    /** Chi tiết: số giấy tờ đầy đủ, mọi lần cư trú (cả đã chuyển đi). */
    public record Response(
            Long id,
            Long buildingId,
            String buildingCode,
            String buildingName,
            String code,
            String fullName,
            String phone,
            String email,
            Gender gender,
            LocalDate dateOfBirth,
            IdDocumentType idType,
            String idNumber,
            String idNumberMasked,
            LocalDate idIssueDate,
            String idIssuePlace,
            String nationality,
            Long avatarFileId,
            String avatarUrl,
            AppAccountStatus appAccountStatus,
            String note,
            List<LinkResponse> apartments,
            ResidenceStatus residenceStatus,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String createdBy,
            String updatedBy,
            Long version) {
    }

    /** Một dòng ở tab "Cư dân" của chi tiết căn hộ. */
    public record ApartmentMember(
            Long linkId,
            Long residentId,
            String code,
            String fullName,
            String phone,
            String avatarUrl,
            ResidentRole role,
            Relationship relationship,
            boolean householdHead,
            LocalDate moveInDate,
            LocalDate moveOutDate,
            ResidenceStatus residenceStatus,
            boolean tempResidenceRegistered,
            Long version) {
    }
}
