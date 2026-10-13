package com.bihome.declaration.dto;

import com.bihome.common.util.PhoneNumbers;
import com.bihome.declaration.Declaration.Status;
import com.bihome.declaration.Declaration.Type;
import com.bihome.resident.ResidentEnums.IdDocumentType;
import com.bihome.resident.ResidentEnums.Relationship;
import com.bihome.resident.ResidentEnums.ResidentRole;
import com.bihome.user.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class DeclarationDtos {

    private DeclarationDtos() {
    }

    /** App cư dân kê khai thành viên. SĐT không bắt buộc (trẻ em); BQL bổ sung khi duyệt nếu thiếu. */
    public record MemberRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotBlank(message = "Họ và tên không được để trống") @Size(max = 150, message = "Họ và tên tối đa 150 ký tự")
            String fullName,
            @Pattern(regexp = PhoneNumbers.REGEX, message = PhoneNumbers.MESSAGE) String phone,
            @Email(message = "Email không hợp lệ") @Size(max = 150) String email,
            Gender gender,
            @PastOrPresent(message = "Ngày sinh không được ở tương lai") LocalDate dateOfBirth,
            IdDocumentType idType,
            @Size(max = 20) String idNumber,
            @NotNull(message = "Vui lòng chọn vai trò tại căn hộ") ResidentRole role,
            Relationship relationship,
            LocalDate moveInDate,
            @Positive Long photoFileId,
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note) {
    }

    public record VehicleRequest(
            @NotNull(message = "Vui lòng chọn căn hộ") Long apartmentId,
            @NotNull(message = "Vui lòng chọn loại xe") Long categoryId,
            @NotBlank(message = "Tên xe không được để trống") @Size(max = 150, message = "Tên xe tối đa 150 ký tự")
            String vehicleName,
            @Size(max = 30, message = "Biển số tối đa 30 ký tự") String plateNumber,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự") String vehicleDescription,
            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự") String note) {
    }

    /**
     * BQL duyệt: các trường gửi kèm là bản BQL đã soát lại (thay cho giá trị cư dân khai); bỏ trống = giữ nguyên.
     * Thành viên bắt buộc có SĐT (cư dân phải có SĐT duy nhất trong tòa).
     */
    public record ApproveRequest(
            @Size(max = 150) String fullName,
            @Pattern(regexp = PhoneNumbers.REGEX, message = PhoneNumbers.MESSAGE) String phone,
            @Email(message = "Email không hợp lệ") @Size(max = 150) String email,
            Gender gender,
            @PastOrPresent(message = "Ngày sinh không được ở tương lai") LocalDate dateOfBirth,
            IdDocumentType idType,
            @Size(max = 20) String idNumber,
            ResidentRole role,
            Relationship relationship,
            LocalDate moveInDate,
            Long categoryId,
            @Size(max = 150) String vehicleName,
            @Size(max = 30) String plateNumber,
            @Size(max = 1000) String vehicleDescription,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record RejectRequest(
            @NotBlank(message = "Vui lòng nhập lý do từ chối") @Size(max = 500, message = "Lý do tối đa 500 ký tự")
            String reason,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            Type type,
            Status status,
            Long apartmentId,
            String apartment,
            LocalDate createdFrom,
            LocalDate createdTo) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String code,
            Type type,
            Status status,
            Long apartmentId,
            String apartmentCode,
            Long submittedById,
            String submittedByName,
            String submittedByPhone,
            String fullName,
            String phone,
            String email,
            Gender gender,
            LocalDate dateOfBirth,
            IdDocumentType idType,
            String idNumber,
            ResidentRole role,
            Relationship relationship,
            LocalDate moveInDate,
            String photoUrl,
            Long categoryId,
            String categoryName,
            String vehicleName,
            String plateNumber,
            String vehicleDescription,
            String note,
            OffsetDateTime reviewedAt,
            String reviewedBy,
            String rejectReason,
            Long resultResidentId,
            Long resultAssetItemId,
            OffsetDateTime createdAt,
            Long version) {
    }
}
