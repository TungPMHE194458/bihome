package com.bihome.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

class GlobalExceptionHandlerTest {

    record CreateRequest(@NotBlank(message = "Mã không được để trống") String code,
                         @Size(max = 5, message = "Tên tối đa 5 ký tự") String name) {
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/business")
        void business() {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATION, "Tòa nhà còn 3 căn hộ");
        }

        @GetMapping("/not-found")
        void notFound() {
            throw new NotFoundException();
        }

        @GetMapping("/version")
        void version() {
            throw new ObjectOptimisticLockingFailureException(Object.class, 1L);
        }

        @GetMapping("/integrity")
        void integrity() {
            throw new DataIntegrityViolationException("ORA-00001: unique constraint (BIHOME.UK_SECRET) violated");
        }

        @GetMapping("/denied")
        void denied() {
            throw new AccessDeniedException("denied");
        }

        @GetMapping("/boom")
        void boom() {
            throw new IllegalStateException("secret internal detail");
        }

        @PostMapping("/create")
        void create(@Valid @RequestBody CreateRequest request) {
        }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void businessExceptionMapsToErrorCodeStatusAndVietnameseDetail() throws Exception {
        mvc.perform(get("/business"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE_VIOLATION"))
                .andExpect(jsonPath("$.detail").value("Tòa nhà còn 3 căn hộ"))
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void notFoundExceptionReturns404() throws Exception {
        mvc.perform(get("/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void validationErrorsAreListedPerField() throws Exception {
        mvc.perform(post("/create").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"\",\"name\":\"quá dài rồi\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors.length()").value(2))
                .andExpect(jsonPath("$.errors[?(@.field=='code')].message").value("Mã không được để trống"))
                .andExpect(jsonPath("$.errors[?(@.field=='name')].message").value("Tên tối đa 5 ký tự"));
    }

    @Test
    void malformedJsonReturns400WithVietnameseDetail() throws Exception {
        mvc.perform(post("/create").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.detail").value("Nội dung yêu cầu không đúng định dạng."));
    }

    @Test
    void optimisticLockReturns409VersionConflict() throws Exception {
        mvc.perform(get("/version"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
    }

    @Test
    void dataIntegrityReturns409WithoutLeakingSql() throws Exception {
        mvc.perform(get("/integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("ORA-"))));
    }

    @Test
    void accessDeniedReturns403() throws Exception {
        mvc.perform(get("/denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void unexpectedErrorReturns500WithoutLeakingMessage() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret"))));
    }

    @Test
    void unsupportedMethodKeepsStandardStatusAndGetsCode() throws Exception {
        mvc.perform(post("/business"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }
}
