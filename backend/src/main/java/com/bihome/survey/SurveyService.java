package com.bihome.survey;

import com.bihome.apartment.Apartment;
import com.bihome.apartment.ApartmentService;
import com.bihome.building.BuildingService;
import com.bihome.common.excel.ExcelWriter;
import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.common.exception.NotFoundException;
import com.bihome.common.security.BuildingContext;
import com.bihome.common.web.PageParams;
import com.bihome.common.web.PageResponse;
import com.bihome.common.web.SpecificationBuilder;
import com.bihome.resident.Resident;
import com.bihome.resident.ResidentAudienceService.Audience;
import com.bihome.resident.ResidentAudienceService;
import com.bihome.resident.ResidentRepository;
import com.bihome.residentapp.ResidentInboxItem;
import com.bihome.residentapp.ResidentInboxService;
import com.bihome.survey.Survey.Status;
import com.bihome.survey.SurveyQuestion.Type;
import com.bihome.survey.dto.SurveyDtos;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Sheet;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Khảo sát ý kiến. Câu hỏi lưu theo thứ tự trong request (FE kéo thả sắp xếp); đã có phản hồi thì không sửa được câu
 * hỏi / lựa chọn / chế độ ẩn danh. Phản hồi chỉ nhận khi Đang mở và trong thời gian khảo sát; mỗi cư dân một lần.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
    private static final Map<String, String> SORTS = Map.of(
            "title", "title", "startAt", "startAt", "endAt", "endAt", "createdAt", "createdAt", "responseCount", "responseCount");
    private static final int TEXT_LIMIT = 50;

    private final SurveyRepository surveys;
    private final SurveyResponseRepository responses;
    private final ResidentAudienceService audienceService;
    private final ResidentInboxService residentInbox;
    private final ApartmentService apartmentService;
    private final ResidentRepository residents;
    private final BuildingService buildingService;
    private final BuildingContext buildingContext;
    private final EntityManager entityManager;
    private final Clock clock;

    // ---------------------------------------------------------------- Đọc

    public PageResponse<SurveyDtos.Response> list(SurveyDtos.Filter f, PageParams pageParams) {
        Optional<Set<Long>> scope = buildingService.listScope(f.buildingId());
        var spec = SpecificationBuilder.<Survey>create()
                .likeAny(f.keyword(), "title", "description")
                .like("title", f.title())
                .eq("status", f.status())
                .eq("audience", f.audience())
                .dateBetween("startAt", f.from(), f.to())
                .and(scope.map(ids -> (Specification<Survey>) (root, q, cb) ->
                        ids.isEmpty() ? cb.disjunction() : root.get("buildingId").in(ids)).orElse(null))
                .build();
        return PageResponse.of(surveys.findAll(spec, pageParams.toPageable(DEFAULT_SORT, SORTS)), s -> toResponse(s, false));
    }

    public SurveyDtos.Response get(Long id) {
        return toResponse(requireAccessible(id), true);
    }

    public PageResponse<SurveyDtos.ResponseSummary> responses(Long id, PageParams pageParams) {
        Survey s = requireAccessible(id);
        Map<Long, SurveyQuestion> questions = s.getQuestions().stream().collect(Collectors.toMap(SurveyQuestion::getId, q -> q));
        Map<Long, String> labels = optionLabels(s);
        var page = responses.findBySurveyIdOrderBySubmittedAtDesc(id, pageParams.toPageable(Sort.by("submittedAt"), Map.of()));
        return PageResponse.of(page, r -> summary(s, r, questions, labels));
    }

    public SurveyDtos.Results results(Long id) {
        Survey s = requireAccessible(id);
        Map<Long, Map<Long, Long>> optionCounts = new HashMap<>();
        for (Object[] row : responses.countOptions(id)) {
            optionCounts.computeIfAbsent((Long) row[0], k -> new HashMap<>()).put((Long) row[1], ((Number) row[2]).longValue());
        }
        Map<Long, long[]> ratingCounts = new HashMap<>();
        for (Object[] row : responses.countRatings(id)) {
            ratingCounts.computeIfAbsent((Long) row[0], k -> new long[6])[((Number) row[1]).intValue()] = ((Number) row[2]).longValue();
        }
        Map<Long, Long> answered = new HashMap<>();
        for (Object[] row : responses.countAnswered(id)) {
            answered.put((Long) row[0], ((Number) row[1]).longValue());
        }
        List<SurveyDtos.QuestionResult> results = new ArrayList<>();
        for (SurveyQuestion q : s.getQuestions()) {
            long n = answered.getOrDefault(q.getId(), 0L);
            List<SurveyDtos.OptionResult> options = q.getOptions().stream().map(o -> {
                long c = optionCounts.getOrDefault(q.getId(), Map.of()).getOrDefault(o.getId(), 0L);
                return new SurveyDtos.OptionResult(o.getId(), o.getLabel(), c, n == 0 ? 0 : Math.round(c * 1000.0 / n) / 10.0);
            }).toList();
            Double average = null;
            List<Long> ratings = null;
            if (q.getType() == Type.RATING) {
                long[] r = ratingCounts.getOrDefault(q.getId(), new long[6]);
                ratings = Arrays.stream(r, 1, 6).boxed().toList();
                long total = Arrays.stream(r).sum();
                long sum = 0;
                for (int star = 1; star <= 5; star++) {
                    sum += star * r[star];
                }
                average = total == 0 ? null : Math.round(sum * 100.0 / total) / 100.0;
            }
            List<String> texts = q.getType() == Type.TEXT
                    ? responses.findTexts(id, q.getId(), PageRequest.of(0, TEXT_LIMIT)).stream().map(SurveyAnswer::getTextValue).toList()
                    : List.of();
            results.add(new SurveyDtos.QuestionResult(q.getId(), q.getType(), q.getContent(), n, options, average, ratings, texts));
        }
        return new SurveyDtos.Results(s.getId(), s.getTitle(), s.getResponseCount(), results);
    }

    public byte[] export(Long id) {
        SurveyDtos.Results r = results(id);
        Survey s = requireAccessible(id);
        Map<Long, String> labels = optionLabels(s);
        Map<Long, SurveyQuestion> questions = s.getQuestions().stream().collect(Collectors.toMap(SurveyQuestion::getId, q -> q));
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet summary = excel.sheet("Tổng hợp", List.of("Câu hỏi", "Lựa chọn / mức", "Số lượt", "Tỉ lệ (%)"));
            for (SurveyDtos.QuestionResult q : r.questions()) {
                excel.row(summary, Arrays.asList(q.content(), "Số người trả lời", q.answered(), null));
                q.options().forEach(o -> excel.row(summary, Arrays.asList(null, o.label(), o.count(), o.percent())));
                if (q.ratings() != null) {
                    for (int star = 1; star <= 5; star++) {
                        excel.row(summary, Arrays.asList(null, star + " sao", q.ratings().get(star - 1), null));
                    }
                    excel.row(summary, Arrays.asList(null, "Điểm trung bình", q.averageRating(), null));
                }
            }
            List<String> headers = new ArrayList<>(List.of("Thời gian", "Căn hộ", "Cư dân"));
            s.getQuestions().forEach(q -> headers.add(q.getContent()));
            Sheet raw = excel.sheet("Phản hồi", headers);
            for (SurveyResponse resp : responses.findAllWithAnswers(id)) {
                List<Object> row = new ArrayList<>(Arrays.asList(resp.getSubmittedAt(),
                        resp.getApartment() == null ? null : resp.getApartment().getCode(),
                        resp.getResident() == null ? null : resp.getResident().getFullName()));
                Map<Long, String> byQuestion = answerTexts(resp, questions, labels);
                s.getQuestions().forEach(q -> row.add(byQuestion.get(q.getId())));
                excel.row(raw, row);
            }
            return excel.toBytes();
        }
    }

    // ---------------------------------------------------------------- Ghi

    @Transactional
    public SurveyDtos.Response create(SurveyDtos.Request req) {
        Long buildingId = buildingContext.requireBuildingId();
        buildingService.requireActive(buildingId, "Tòa nhà đang không hoạt động, không thể tạo khảo sát.");
        Survey s = new Survey();
        s.setBuildingId(buildingId);
        s.setStatus(Status.DRAFT);
        applyInfo(s, req);
        replaceQuestions(s, req.questions());
        surveys.saveAndFlush(s);
        return reload(s.getId());
    }

    @Transactional
    public SurveyDtos.Response update(Long id, SurveyDtos.Request req) {
        Survey s = requireAccessible(id);
        if (s.getStatus() == Status.CLOSED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Khảo sát đã đóng, không sửa được.");
        }
        requireVersion(s, req.version());
        long count = responses.countBySurveyId(id);
        if (count > 0) {
            if (req.anonymous() != s.isAnonymous() || !sameQuestions(s, req.questions())) {
                throw new BusinessException(ErrorCode.CONFLICT,
                        "Khảo sát đã có " + count + " phản hồi, không sửa được câu hỏi và chế độ ẩn danh.");
            }
            applyInfo(s, req);
        } else {
            applyInfo(s, req);
            replaceQuestions(s, req.questions());
        }
        surveys.saveAndFlush(s);
        return reload(id);
    }

    @Transactional
    public SurveyDtos.Response publish(Long id, Long version) {
        Survey s = requireAccessible(id);
        requireVersion(s, version);
        if (s.getStatus() != Status.DRAFT) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ phát hành được khảo sát nháp.");
        }
        if (s.getQuestions().isEmpty()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Khảo sát chưa có câu hỏi.");
        }
        if (!s.getEndAt().isAfter(OffsetDateTime.now(clock))) {
            throw BusinessException.field(ErrorCode.VALIDATION_ERROR, "endAt", "Thời gian kết thúc đã qua.");
        }
        s.setStatus(Status.OPEN);
        s.setPublishedAt(OffsetDateTime.now(clock));
        surveys.saveAndFlush(s);
        residentInbox.toResidents(audienceService.resolve(s.getBuildingId(), s.getAudience(), s.getTargets()).stream()
                        .map(ResidentAudienceService.Recipient::residentId).toList(), ResidentInboxItem.Type.SURVEY,
                "Khảo sát mới: " + s.getTitle(), "Mời bạn trả lời khảo sát của Ban quản lý.", "/surveys/" + s.getId());
        return reload(id);
    }

    @Transactional
    public SurveyDtos.Response close(Long id, Long version) {
        Survey s = requireAccessible(id);
        requireVersion(s, version);
        if (s.getStatus() != Status.OPEN) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Chỉ đóng được khảo sát đang mở.");
        }
        s.setStatus(Status.CLOSED);
        s.setClosedAt(OffsetDateTime.now(clock));
        surveys.saveAndFlush(s);
        return reload(id);
    }

    @Transactional
    public void delete(Long id) {
        Survey s = requireAccessible(id);
        long count = responses.countBySurveyId(id);
        if (count > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "Khảo sát đã có " + count + " phản hồi, hãy đóng thay vì xoá.");
        }
        surveys.delete(s);
    }

    /** Nhập một phản hồi (BQL nhập hộ). */
    @Transactional
    public SurveyDtos.ResponseSummary submit(Long id, SurveyDtos.ResponseRequest req) {
        Survey s = requireAccessible(id);
        OffsetDateTime now = OffsetDateTime.now(clock);
        if (s.getStatus() != Status.OPEN || now.isBefore(s.getStartAt()) || !now.isBefore(s.getEndAt())) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Khảo sát không trong thời gian nhận phản hồi.");
        }
        SurveyResponse r = new SurveyResponse();
        r.setSurveyId(id);
        r.setSubmittedAt(now);
        if (!s.isAnonymous()) {
            respondent(s, r, req);
        }
        Map<Long, SurveyDtos.AnswerRequest> byQuestion = new HashMap<>();
        for (SurveyDtos.AnswerRequest a : req.answers()) {
            if (byQuestion.put(a.questionId(), a) != null) {
                throw field("answers", "Mỗi câu hỏi chỉ trả lời một lần.");
            }
        }
        Set<Long> known = s.getQuestions().stream().map(SurveyQuestion::getId).collect(Collectors.toSet());
        if (!known.containsAll(byQuestion.keySet())) {
            throw field("answers", "Có câu trả lời không thuộc khảo sát.");
        }
        int index = 0;
        for (SurveyQuestion q : s.getQuestions()) {
            index++;
            addAnswers(r, q, byQuestion.get(q.getId()), "answers[" + (index - 1) + "]", index);
        }
        if (r.getAnswers().isEmpty()) {
            throw field("answers", "Chưa trả lời câu hỏi nào.");
        }
        responses.saveAndFlush(r);
        entityManager.flush();
        entityManager.clear();
        Survey fresh = requireAccessible(id);
        SurveyResponse saved = responses.findById(r.getId()).orElseThrow();
        return summary(fresh, saved, fresh.getQuestions().stream().collect(Collectors.toMap(SurveyQuestion::getId, q -> q)),
                optionLabels(fresh));
    }

    /** Job mỗi phút: đóng khảo sát đang mở đã hết thời gian. */
    @Transactional
    public int closeExpired() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        int n = 0;
        for (Long id : surveys.findExpiredIds(now)) {
            Survey s = surveys.findById(id).orElseThrow();
            if (s.getStatus() == Status.OPEN) {
                s.setStatus(Status.CLOSED);
                s.setClosedAt(now);
                n++;
            }
        }
        return n;
    }

    // ---------------------------------------------------------------- Helpers

    private void applyInfo(Survey s, SurveyDtos.Request req) {
        if (!req.endAt().isAfter(req.startAt())) {
            throw field("endAt", "Thời gian kết thúc phải sau thời gian bắt đầu.");
        }
        if (req.audience() == Audience.RESIDENT) {
            throw field("audience", "Khảo sát chọn đối tượng theo toàn tòa, tầng hoặc căn hộ.");
        }
        s.setTitle(req.title().trim());
        s.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        s.setAudience(req.audience());
        s.setTargets(new LinkedHashSet<>(audienceService.validateTargets(s.getBuildingId(), req.audience(), req.targets(), "targets")));
        s.setStartAt(req.startAt());
        s.setEndAt(req.endAt());
        s.setAnonymous(req.anonymous());
    }

    private void replaceQuestions(Survey s, List<SurveyDtos.QuestionRequest> requests) {
        List<SurveyDtos.QuestionRequest> list = requests == null ? List.of() : requests;
        s.getQuestions().clear();
        int position = 0;
        for (SurveyDtos.QuestionRequest qr : list) {
            String path = "questions[" + position + "]";
            List<String> labels = qr.options() == null ? List.of()
                    : qr.options().stream().map(o -> o.label().trim()).toList();
            if (qr.type().hasOptions()) {
                if (labels.size() < 2) {
                    throw field(path + ".options", "Câu " + (position + 1) + ": cần ít nhất 2 lựa chọn.");
                }
                if (new HashSet<>(labels.stream().map(String::toLowerCase).toList()).size() != labels.size()) {
                    throw field(path + ".options", "Câu " + (position + 1) + ": các lựa chọn bị trùng.");
                }
            }
            SurveyQuestion q = new SurveyQuestion();
            q.setSurvey(s);
            q.setPosition(position++);
            q.setType(qr.type());
            q.setContent(qr.content().trim());
            q.setRequired(qr.required());
            if (qr.type().hasOptions()) {
                int op = 0;
                for (String label : labels) {
                    SurveyOption o = new SurveyOption();
                    o.setQuestion(q);
                    o.setPosition(op++);
                    o.setLabel(label);
                    q.getOptions().add(o);
                }
            }
            s.getQuestions().add(q);
        }
    }

    /** Câu hỏi gửi lên giống hệt câu hỏi đã lưu (cùng id, thứ tự, loại, nội dung, bắt buộc, lựa chọn). */
    private static boolean sameQuestions(Survey s, List<SurveyDtos.QuestionRequest> requests) {
        List<SurveyDtos.QuestionRequest> list = requests == null ? List.of() : requests;
        if (list.size() != s.getQuestions().size()) {
            return false;
        }
        for (int i = 0; i < list.size(); i++) {
            SurveyQuestion q = s.getQuestions().get(i);
            SurveyDtos.QuestionRequest r = list.get(i);
            List<String> labels = r.options() == null ? List.of() : r.options().stream().map(o -> o.label().trim()).toList();
            if (!Objects.equals(q.getId(), r.id()) || q.getType() != r.type() || !q.getContent().equals(r.content().trim())
                    || q.isRequired() != r.required()
                    || !q.getOptions().stream().map(SurveyOption::getLabel).toList().equals(q.getType().hasOptions() ? labels : List.of())) {
                return false;
            }
        }
        return true;
    }

    private void respondent(Survey s, SurveyResponse r, SurveyDtos.ResponseRequest req) {
        if (req.apartmentId() == null) {
            throw field("apartmentId", "Vui lòng chọn căn hộ trả lời.");
        }
        Apartment apartment = apartmentService.requireAccessible(req.apartmentId());
        if (!apartment.getBuildingId().equals(s.getBuildingId())) {
            throw field("apartmentId", "Căn hộ không thuộc tòa của khảo sát.");
        }
        // Đối tượng "Cư dân cụ thể": xét theo cư dân trả lời, không theo căn hộ.
        boolean inAudience = s.getAudience() == Audience.RESIDENT
                ? req.residentId() != null && s.getTargets().contains(String.valueOf(req.residentId()))
                : audienceService.apartmentInAudience(apartment, s.getAudience(), s.getTargets());
        if (!inAudience) {
            throw field(s.getAudience() == Audience.RESIDENT ? "residentId" : "apartmentId",
                    "Căn hộ / cư dân không thuộc đối tượng của khảo sát.");
        }
        r.setApartmentId(apartment.getId());
        if (req.residentId() != null) {
            Resident resident = residents.findById(req.residentId())
                    .filter(x -> x.getBuildingId().equals(s.getBuildingId()))
                    .orElseThrow(() -> field("residentId", "Cư dân không thuộc tòa của khảo sát."));
            if (resident.activeLinks().stream().noneMatch(l -> l.getApartmentId().equals(apartment.getId()))) {
                throw field("residentId", "Cư dân không ở căn hộ đã chọn.");
            }
            if (responses.existsBySurveyIdAndResidentId(s.getId(), resident.getId())) {
                throw BusinessException.field(ErrorCode.CONFLICT, "residentId", "Cư dân đã trả lời khảo sát này.");
            }
            r.setResidentId(resident.getId());
        }
    }

    private static void addAnswers(SurveyResponse r, SurveyQuestion q, SurveyDtos.AnswerRequest a, String path, int no) {
        boolean empty = a == null
                || switch (q.getType()) {
                    case SINGLE, MULTIPLE -> a.optionIds() == null || a.optionIds().isEmpty();
                    case TEXT -> a.text() == null || a.text().isBlank();
                    case RATING -> a.rating() == null;
                };
        if (empty) {
            if (q.isRequired()) {
                throw field(path, "Câu " + no + " là câu bắt buộc.");
            }
            return;
        }
        switch (q.getType()) {
            case SINGLE, MULTIPLE -> {
                Set<Long> chosen = new LinkedHashSet<>(a.optionIds());
                Set<Long> valid = q.getOptions().stream().map(SurveyOption::getId).collect(Collectors.toSet());
                if (!valid.containsAll(chosen)) {
                    throw field(path, "Câu " + no + ": lựa chọn không hợp lệ.");
                }
                if (q.getType() == Type.SINGLE && chosen.size() > 1) {
                    throw field(path, "Câu " + no + " chỉ chọn một đáp án.");
                }
                chosen.forEach(optionId -> r.getAnswers().add(answer(r, q, optionId, null, null)));
            }
            case TEXT -> r.getAnswers().add(answer(r, q, null, a.text().trim(), null));
            case RATING -> r.getAnswers().add(answer(r, q, null, null, a.rating()));
        }
    }

    private static SurveyAnswer answer(SurveyResponse r, SurveyQuestion q, Long optionId, String text, Integer rating) {
        SurveyAnswer x = new SurveyAnswer();
        x.setResponse(r);
        x.setQuestionId(q.getId());
        x.setOptionId(optionId);
        x.setTextValue(text);
        x.setRating(rating);
        return x;
    }

    private static Map<Long, String> optionLabels(Survey s) {
        return s.getQuestions().stream().flatMap(q -> q.getOptions().stream())
                .collect(Collectors.toMap(SurveyOption::getId, SurveyOption::getLabel));
    }

    private static Map<Long, String> answerTexts(SurveyResponse r, Map<Long, SurveyQuestion> questions, Map<Long, String> labels) {
        Map<Long, List<String>> parts = new HashMap<>();
        for (SurveyAnswer a : r.getAnswers()) {
            SurveyQuestion q = questions.get(a.getQuestionId());
            if (q == null) {
                continue;
            }
            String text = a.getOptionId() != null ? labels.get(a.getOptionId())
                    : a.getRating() != null ? a.getRating() + " sao" : a.getTextValue();
            parts.computeIfAbsent(q.getId(), k -> new ArrayList<>()).add(text);
        }
        Map<Long, String> result = new HashMap<>();
        parts.forEach((k, v) -> result.put(k, String.join("; ", v)));
        return result;
    }

    private SurveyDtos.ResponseSummary summary(Survey s, SurveyResponse r, Map<Long, SurveyQuestion> questions,
                                               Map<Long, String> labels) {
        Map<Long, String> byQuestion = answerTexts(r, questions, labels);
        List<String> answers = s.getQuestions().stream().map(q -> byQuestion.getOrDefault(q.getId(), "")).toList();
        return new SurveyDtos.ResponseSummary(r.getId(), r.getSubmittedAt(),
                r.getApartment() == null ? null : r.getApartment().getCode(),
                r.getResident() == null ? null : r.getResident().getFullName(), r.getCreatedBy(), answers);
    }

    private SurveyDtos.Response reload(Long id) {
        entityManager.flush();
        entityManager.clear();
        return get(id);
    }

    Survey requireAccessible(Long id) {
        return surveys.findWithQuestionsById(id)
                .filter(s -> buildingService.canAccess(s.getBuildingId()))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy khảo sát."));
    }

    private static void requireVersion(Survey s, Long version) {
        if (version == null || !Objects.equals(s.getVersion(), version)) {
            throw new BusinessException(ErrorCode.VERSION_CONFLICT);
        }
    }

    private String phase(Survey s) {
        if (s.getStatus() != Status.OPEN) {
            return s.getStatus().name();
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        return now.isBefore(s.getStartAt()) ? "UPCOMING" : now.isBefore(s.getEndAt()) ? "ACTIVE" : "ENDED";
    }

    private SurveyDtos.Response toResponse(Survey s, boolean withQuestions) {
        List<SurveyDtos.QuestionResponse> questions = withQuestions ? s.getQuestions().stream()
                .map(q -> new SurveyDtos.QuestionResponse(q.getId(), q.getType(), q.getContent(), q.isRequired(),
                        q.getOptions().stream().map(o -> new SurveyDtos.OptionResponse(o.getId(), o.getLabel())).toList()))
                .toList() : List.of();
        return new SurveyDtos.Response(s.getId(), s.getBuildingId(), s.getBuilding().getName(), s.getTitle(), s.getDescription(),
                s.getAudience(), List.copyOf(s.getTargets()), audienceService.label(s.getAudience(), s.getTargets()),
                withQuestions ? audienceService.describe(s.getAudience(), s.getTargets()) : List.of(), s.getStartAt(), s.getEndAt(), s.isAnonymous(), s.getStatus(),
                phase(s), s.getResponseCount(), s.getQuestions().size(), s.getResponseCount() > 0, questions,
                s.getPublishedAt(), s.getClosedAt(), s.getCreatedAt(), s.getCreatedBy(), s.getVersion());
    }

    private static BusinessException field(String field, String message) {
        return BusinessException.field(ErrorCode.VALIDATION_ERROR, field, message);
    }
}
