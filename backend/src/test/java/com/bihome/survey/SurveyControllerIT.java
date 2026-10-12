package com.bihome.survey;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.apartment.Apartment;
import com.bihome.building.Building;
import com.bihome.common.excel.ExcelWriter;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class SurveyControllerIT extends AbstractIT {

    @Autowired
    SurveyRepository surveyRepository;

    @Autowired
    SurveyService surveyService;

    private Building tower;
    private Apartment a1;
    private Apartment a2;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        a1 = createApartment(tower.getId(), "A1");
        a2 = createApartment(tower.getId(), "A2");
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
    }

    @Test
    @SuppressWarnings("unchecked")
    void builderValidatesQuestionsAndLocksThemOnceAnswered() throws Exception {
        Map<String, Object> bad = survey(false);
        ((List<Map<String, Object>>) bad.get("questions")).add(question("SINGLE", "Một lựa chọn", true, List.of("Có")));
        send(post("/api/v1/surveys"), bad).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("questions[3].options"));

        JsonNode s = json(send(post("/api/v1/surveys"), survey(false)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.questions.length()").value(3))
                .andExpect(jsonPath("$.questions[0].options[1].label").value("Tốt")));
        long id = s.get("id").asLong();

        // Đổi thứ tự (kéo thả) khi chưa có phản hồi.
        Map<String, Object> reordered = survey(false);
        List<Map<String, Object>> qs = (List<Map<String, Object>>) reordered.get("questions");
        qs.add(0, qs.remove(2));
        reordered.put("version", s.get("version").asLong());
        s = json(send(put("/api/v1/surveys/{id}", id), reordered).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].type").value("TEXT")));

        s = json(send(post("/api/v1/surveys/{id}/publish", id), Map.of("version", s.get("version").asLong()))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.phase").value("ACTIVE")));
        JsonNode questions = s.get("questions");
        long text = questions.get(0).get("id").asLong();
        long single = questions.get(1).get("id").asLong();
        long good = questions.get(1).get("options").get(1).get("id").asLong();
        long rating = questions.get(2).get("id").asLong();

        // Câu bắt buộc thiếu, chọn 2 đáp án cho câu một lựa chọn.
        send(post("/api/v1/surveys/{id}/responses", id), response(a1, List.of(Map.of("questionId", rating, "rating", 4))))
                .andExpect(status().isBadRequest());
        send(post("/api/v1/surveys/{id}/responses", id), response(a1, List.of(
                Map.of("questionId", single, "optionIds", List.of(good, questions.get(1).get("options").get(0).get("id").asLong())),
                Map.of("questionId", rating, "rating", 4)))).andExpect(status().isBadRequest());

        send(post("/api/v1/surveys/{id}/responses", id), response(a1, List.of(
                Map.of("questionId", single, "optionIds", List.of(good)),
                Map.of("questionId", rating, "rating", 4),
                Map.of("questionId", text, "text", "Thang máy cần bảo trì"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apartmentCode").value("A1"))
                .andExpect(jsonPath("$.answers[0]").value("Thang máy cần bảo trì"));
        send(post("/api/v1/surveys/{id}/responses", id), response(a2, List.of(
                Map.of("questionId", single, "optionIds", List.of(good)),
                Map.of("questionId", rating, "rating", 2)))).andExpect(status().isCreated());

        mvc.perform(get("/api/v1/surveys/{id}/results", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.responseCount").value(2))
                .andExpect(jsonPath("$.questions[0].texts[0]").value("Thang máy cần bảo trì"))
                .andExpect(jsonPath("$.questions[1].options[1].count").value(2))
                .andExpect(jsonPath("$.questions[1].options[1].percent").value(100.0))
                .andExpect(jsonPath("$.questions[2].averageRating").value(3.0))
                .andExpect(jsonPath("$.questions[2].ratings[1]").value(1));
        mvc.perform(get("/api/v1/surveys/{id}/export", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(ExcelWriter.CONTENT_TYPE));

        // Đã có phản hồi: sửa câu hỏi bị chặn, sửa thông tin chung vẫn được; không xoá được.
        JsonNode current = json(mvc.perform(get("/api/v1/surveys/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token))));
        Map<String, Object> changed = survey(false);
        changed.put("version", current.get("version").asLong());
        send(put("/api/v1/surveys/{id}", id), changed).andExpect(status().isConflict());
        Map<String, Object> same = sameAs(current);
        same.put("title", "Khảo sát dịch vụ (cập nhật)");
        send(put("/api/v1/surveys/{id}", id), same).andExpect(jsonPath("$.title").value("Khảo sát dịch vụ (cập nhật)"));
        send(delete("/api/v1/surveys/{id}", id), null).andExpect(status().isConflict());
    }

    @Test
    void anonymousSurveysDoNotStoreRespondentsAndExpiredSurveysClose() throws Exception {
        JsonNode s = json(send(post("/api/v1/surveys"), survey(true)));
        long id = s.get("id").asLong();
        s = json(send(post("/api/v1/surveys/{id}/publish", id), Map.of("version", s.get("version").asLong())));
        long single = s.get("questions").get(0).get("id").asLong();
        long option = s.get("questions").get(0).get("options").get(0).get("id").asLong();
        long rating = s.get("questions").get(1).get("id").asLong();
        send(post("/api/v1/surveys/{id}/responses", id), response(a1, List.of(
                Map.of("questionId", single, "optionIds", List.of(option)), Map.of("questionId", rating, "rating", 5))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.apartmentCode").doesNotExist());

        Survey survey = surveyRepository.findById(id).orElseThrow();
        survey.setStartAt(OffsetDateTime.now().minusDays(3));
        survey.setEndAt(OffsetDateTime.now().minusMinutes(1));
        surveyRepository.saveAndFlush(survey);
        assertThat(surveyService.closeExpired()).isGreaterThanOrEqualTo(1);
        mvc.perform(get("/api/v1/surveys/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.status").value("CLOSED"));
        send(post("/api/v1/surveys/{id}/responses", id), response(a2, List.of(Map.of("questionId", rating, "rating", 5))))
                .andExpect(status().isUnprocessableEntity());
    }

    private Map<String, Object> survey(boolean anonymous) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Khảo sát dịch vụ");
        body.put("description", "Ý kiến cư dân");
        body.put("audience", "ALL");
        body.put("targets", List.of());
        body.put("startAt", OffsetDateTime.now().minusHours(1));
        body.put("endAt", OffsetDateTime.now().plusDays(7));
        body.put("anonymous", anonymous);
        List<Map<String, Object>> questions = new ArrayList<>();
        questions.add(question("SINGLE", "Vệ sinh khu vực chung", true, List.of("Rất tốt", "Tốt", "Cần cải thiện")));
        questions.add(question("RATING", "Mức độ hài lòng", true, List.of()));
        if (!anonymous) {
            questions.add(question("TEXT", "Góp ý khác", false, List.of()));
        }
        body.put("questions", questions);
        return body;
    }

    private static Map<String, Object> question(String type, String content, boolean required, List<String> options) {
        Map<String, Object> q = new HashMap<>();
        q.put("type", type);
        q.put("content", content);
        q.put("required", required);
        q.put("options", options.stream().map(o -> Map.of("label", o)).toList());
        return q;
    }

    /** Request giữ nguyên câu hỏi (id, thứ tự, lựa chọn) của khảo sát hiện tại. */
    private Map<String, Object> sameAs(JsonNode s) throws Exception {
        Map<String, Object> body = survey(false);
        body.put("startAt", s.get("startAt").asText());
        body.put("endAt", s.get("endAt").asText());
        List<Map<String, Object>> questions = new ArrayList<>();
        for (JsonNode q : s.get("questions")) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", q.get("id").asLong());
            m.put("type", q.get("type").asText());
            m.put("content", q.get("content").asText());
            m.put("required", q.get("required").asBoolean());
            List<Map<String, Object>> options = new ArrayList<>();
            q.get("options").forEach(o -> options.add(Map.of("id", o.get("id").asLong(), "label", o.get("label").asText())));
            m.put("options", options);
            questions.add(m);
        }
        body.put("questions", questions);
        body.put("version", s.get("version").asLong());
        return body;
    }

    private static Map<String, Object> response(Apartment apartment, List<Map<String, Object>> answers) {
        Map<String, Object> body = new HashMap<>();
        body.put("apartmentId", apartment.getId());
        body.put("answers", answers);
        return body;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, bearer(token)).header("X-Building-Id", tower.getId().toString());
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
