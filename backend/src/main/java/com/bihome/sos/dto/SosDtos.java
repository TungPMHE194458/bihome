package com.bihome.sos.dto;

import com.bihome.sos.SosAlert.AlertType;
import com.bihome.sos.SosAlert.Source;
import com.bihome.sos.SosAlert.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class SosDtos {

    private SosDtos() {
    }

    /** BQL tạo cảnh báo (nhận qua điện thoại, tại chỗ); phải có căn hộ hoặc vị trí. */
    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn loại sự cố") AlertType alertType,
            Long apartmentId,
            @Size(max = 150, message = "Tên người báo tối đa 150 ký tự") String reporterName,
            @Pattern(regexp = "^$|^[0-9+ .()-]{8,20}$", message = "Số điện thoại không hợp lệ") String reporterPhone,
            @Size(max = 200, message = "Vị trí tối đa 200 ký tự") String location,
            @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự") String description) {
    }

    public record VersionRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    /** Kết thúc cảnh báo: RESOLVED đã xử lý / FALSE_ALARM báo nhầm, ghi chú bắt buộc. */
    public record ResolveRequest(
            @NotNull(message = "Vui lòng chọn kết quả") Status status,
            @NotBlank(message = "Vui lòng nhập kết quả xử lý") @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
            String note,
            @NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String code,
            AlertType alertType,
            Status status,
            /** true = chỉ cảnh báo chưa kết thúc (Mới / Đã tiếp nhận). */
            Boolean open,
            String apartment,
            LocalDate from,
            LocalDate to) {
    }

    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String code,
            AlertType alertType,
            Source source,
            Long apartmentId,
            String apartmentCode,
            String reporterName,
            String reporterPhone,
            String location,
            String description,
            Status status,
            OffsetDateTime acknowledgedAt,
            String acknowledgedBy,
            OffsetDateTime resolvedAt,
            String resolvedBy,
            String resolutionNote,
            OffsetDateTime createdAt,
            String createdBy,
            Long version) {
    }

    /** Cho nút SOS ở header: số cảnh báo đang mở + vài cảnh báo mới nhất. */
    public record Active(long count, long newCount, Long latestId, List<Response> latest) {
    }
}
