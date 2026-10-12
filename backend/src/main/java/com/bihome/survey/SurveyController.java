package com.bihome.survey;

import com.bihome.common.excel.ExcelResponses;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.survey.dto.SurveyDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Khảo sát ý kiến")
@RestController
@RequestMapping("/api/v1/surveys")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyService surveyService;

    @Operation(summary = "Danh sách khảo sát", description = "Phạm vi theo tòa đang chọn.")
    @GetMapping
    @PreAuthorize("hasAuthority('SURVEY_READ')")
    public PageResponse<SurveyDtos.Response> list(@ParameterObject SurveyDtos.Filter filter, @ParameterObject PageParams pageParams) {
        return surveyService.list(filter, pageParams);
    }

    @Operation(summary = "Chi tiết khảo sát (kèm câu hỏi)")
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SURVEY_READ')")
    public SurveyDtos.Response get(@PathVariable Long id) {
        return surveyService.get(id);
    }

    @Operation(summary = "Tạo khảo sát (nháp)", description = "Thứ tự câu hỏi / lựa chọn theo thứ tự trong danh sách.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SURVEY_WRITE')")
    public SurveyDtos.Response create(@Valid @RequestBody SurveyDtos.Request request) {
        return surveyService.create(request);
    }

    @Operation(summary = "Sửa khảo sát", description = "Đã có phản hồi thì chỉ sửa được thông tin chung, không sửa câu hỏi.")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SURVEY_WRITE')")
    public SurveyDtos.Response update(@PathVariable Long id, @Valid @RequestBody SurveyDtos.Request request) {
        return surveyService.update(id, request);
    }

    @Operation(summary = "Phát hành (mở nhận phản hồi)")
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAuthority('SURVEY_WRITE')")
    public SurveyDtos.Response publish(@PathVariable Long id, @Valid @RequestBody SurveyDtos.VersionRequest request) {
        return surveyService.publish(id, request.version());
    }

    @Operation(summary = "Đóng khảo sát")
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('SURVEY_WRITE')")
    public SurveyDtos.Response close(@PathVariable Long id, @Valid @RequestBody SurveyDtos.VersionRequest request) {
        return surveyService.close(id, request.version());
    }

    @Operation(summary = "Xoá khảo sát chưa có phản hồi")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SURVEY_DELETE')")
    public void delete(@PathVariable Long id) {
        surveyService.delete(id);
    }

    @Operation(summary = "Danh sách phản hồi")
    @GetMapping("/{id}/responses")
    @PreAuthorize("hasAuthority('SURVEY_READ')")
    public PageResponse<SurveyDtos.ResponseSummary> responses(@PathVariable Long id, @ParameterObject PageParams pageParams) {
        return surveyService.responses(id, pageParams);
    }

    @Operation(summary = "Nhập phản hồi (BQL nhập hộ)")
    @PostMapping("/{id}/responses")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SURVEY_WRITE')")
    public SurveyDtos.ResponseSummary submit(@PathVariable Long id, @Valid @RequestBody SurveyDtos.ResponseRequest request) {
        return surveyService.submit(id, request);
    }

    @Operation(summary = "Kết quả theo câu hỏi")
    @GetMapping("/{id}/results")
    @PreAuthorize("hasAuthority('SURVEY_READ')")
    public SurveyDtos.Results results(@PathVariable Long id) {
        return surveyService.results(id);
    }

    @Operation(summary = "Xuất Excel kết quả và phản hồi")
    @GetMapping("/{id}/export")
    @PreAuthorize("hasAuthority('SURVEY_EXPORT')")
    public ResponseEntity<byte[]> export(@PathVariable Long id) {
        return ExcelResponses.attachment(surveyService.export(id), "khao-sat-" + id + ".xlsx");
    }
}
