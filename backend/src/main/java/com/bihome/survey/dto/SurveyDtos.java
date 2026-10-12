package com.bihome.survey.dto;

import com.bihome.resident.ResidentAudienceService;
import com.bihome.resident.ResidentAudienceService.Audience;
import com.bihome.survey.Survey.Status;
import com.bihome.survey.SurveyQuestion.Type;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

public final class SurveyDtos {

    private SurveyDtos() {
    }

    public record OptionRequest(
            Long id,
            @NotBlank(message = "Nội dung lựa chọn không được để trống")
            @Size(max = 200, message = "Lựa chọn tối đa 200 ký tự")
            String label) {
    }

    public record QuestionRequest(
            Long id,
            @NotNull(message = "Vui lòng chọn loại câu hỏi") Type type,
            @NotBlank(message = "Nội dung câu hỏi không được để trống")
            @Size(max = 500, message = "Câu hỏi tối đa 500 ký tự")
            String content,
            boolean required,
            @Size(max = 20, message = "Tối đa 20 lựa chọn mỗi câu") List<@Valid @NotNull OptionRequest> options) {
    }

    /** Thứ tự câu hỏi / lựa chọn = thứ tự trong danh sách. */
    public record Request(
            @NotBlank(message = "Tiêu đề không được để trống")
            @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
            String title,
            @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự") String description,
            @NotNull(message = "Vui lòng chọn đối tượng") Audience audience,
            @Size(max = 500, message = "Tối đa 500 đối tượng") Set<@NotBlank String> targets,
            @NotNull(message = "Vui lòng chọn thời gian bắt đầu") OffsetDateTime startAt,
            @NotNull(message = "Vui lòng chọn thời gian kết thúc") OffsetDateTime endAt,
            boolean anonymous,
            @Size(max = 50, message = "Tối đa 50 câu hỏi") List<@Valid @NotNull QuestionRequest> questions,
            Long version) {
    }

    public record Filter(
            String keyword,
            Long buildingId,
            String title,
            Status status,
            Audience audience,
            LocalDate from,
            LocalDate to) {
    }

    public record OptionResponse(Long id, String label) {
    }

    public record QuestionResponse(Long id, Type type, String content, boolean required, List<OptionResponse> options) {
    }

    /**
     * @param phase OPEN chia nhỏ theo thời gian: UPCOMING chưa tới giờ, ACTIVE đang nhận phản hồi, ENDED quá giờ (chờ
     *              job đóng); DRAFT / CLOSED như trạng thái
     */
    public record Response(
            Long id,
            Long buildingId,
            String buildingName,
            String title,
            String description,
            Audience audience,
            List<String> targets,
            String targetLabel,
            List<ResidentAudienceService.Target> targetItems,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            boolean anonymous,
            Status status,
            String phase,
            long responseCount,
            int questionCount,
            /** Có phản hồi thì không sửa được câu hỏi. */
            boolean questionsLocked,
            List<QuestionResponse> questions,
            OffsetDateTime publishedAt,
            OffsetDateTime closedAt,
            OffsetDateTime createdAt,
            String createdBy,
            Long version) {
    }

    public record AnswerRequest(
            @NotNull Long questionId,
            @Size(max = 20) List<@NotNull Long> optionIds,
            @Size(max = 2000, message = "Câu trả lời tối đa 2000 ký tự") String text,
            @Min(value = 1, message = "Đánh giá từ 1 đến 5 sao") @Max(value = 5, message = "Đánh giá từ 1 đến 5 sao") Integer rating) {
    }

    /** BQL nhập hộ phản hồi (phiếu giấy, gọi điện); khảo sát ẩn danh thì bỏ qua căn hộ / cư dân. */
    public record ResponseRequest(
            Long apartmentId,
            Long residentId,
            @NotNull(message = "Thiếu câu trả lời") List<@Valid @NotNull AnswerRequest> answers) {
    }

    public record ResponseSummary(
            Long id,
            OffsetDateTime submittedAt,
            String apartmentCode,
            String residentName,
            String createdBy,
            /** Câu hỏi → câu trả lời dạng chữ. */
            List<String> answers) {
    }

    public record OptionResult(Long optionId, String label, long count, double percent) {
    }

    /**
     * @param answered số phản hồi có trả lời câu này
     * @param ratings  số lượt 1..5 sao (chỉ câu đánh giá)
     * @param texts    các câu trả lời văn bản mới nhất (tối đa 50)
     */
    public record QuestionResult(
            Long questionId,
            Type type,
            String content,
            long answered,
            List<OptionResult> options,
            Double averageRating,
            List<Long> ratings,
            List<String> texts) {
    }

    public record Results(Long surveyId, String title, long responseCount, List<QuestionResult> questions) {
    }

    public record VersionRequest(@NotNull(message = "Thiếu phiên bản dữ liệu") Long version) {
    }
}
