package com.bihome.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class UserControllerIT extends AbstractIT {

    private AppUser admin;
    private String adminToken;
    private int buildingA;
    private int buildingB;

    @BeforeEach
    void setUp() throws Exception {
        admin = createUser(unique("admin"), "SUPER_ADMIN");
        adminToken = login(admin.getUsername());
        int first = createBuilding().getId().intValue();
        int second = createBuilding().getId().intValue();
        buildingA = Math.min(first, second);
        buildingB = Math.max(first, second);
    }

    @Test
    void createUserReturnsTemporaryPasswordThatMustBeChangedOnFirstLogin() throws Exception {
        String username = unique("NV.");
        Map<String, Object> body = newUser(username);

        MvcResult result = send(post("/api/v1/users"), body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.username").value(username.toLowerCase()))
                .andExpect(jsonPath("$.user.profile.fullName").value("Nguyễn Văn An"))
                .andExpect(jsonPath("$.user.mustChangePassword").value(true))
                .andExpect(jsonPath("$.user.roles[0].code").value("STAFF"))
                .andExpect(jsonPath("$.user.buildingIds", Matchers.contains(buildingA, buildingB)))
                .andExpect(jsonPath("$.user.createdBy").value(admin.getUsername()))
                .andReturn();
        String temporaryPassword = json(result).get("temporaryPassword").asText();
        assertThat(PasswordPolicy.isValid(temporaryPassword)).isTrue();

        MvcResult login = loginResult(username.toLowerCase(), temporaryPassword);
        assertThat(json(login).get("mustChangePassword").asBoolean()).isTrue();
    }

    @Test
    void duplicateUsernameAndEmailReturn409WithFieldErrors() throws Exception {
        AppUser existing = createUser(unique("staff"), "STAFF");
        Map<String, Object> body = newUser(existing.getUsername());
        body.put("email", existing.getEmail());

        send(post("/api/v1/users"), body)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(jsonPath("$.errors[*].field", Matchers.containsInAnyOrder("username", "email")));
    }

    @Test
    void invalidRequestReturnsVietnameseFieldErrors() throws Exception {
        Map<String, Object> body = newUser(unique("staff"));
        body.put("email", "khong-phai-email");
        body.put("fullName", "");
        body.put("phone", "12345");
        body.put("roleCodes", List.of());

        send(post("/api/v1/users"), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[*].field",
                        Matchers.containsInAnyOrder("email", "fullName", "phone", "roleCodes")))
                .andExpect(jsonPath("$.errors[?(@.field=='email')].message").value("Email không đúng định dạng"));
    }

    @Test
    void unknownRoleIsRejected() throws Exception {
        Map<String, Object> body = newUser(unique("staff"));
        body.put("roleCodes", List.of("STAFF", "HACKER"));

        send(post("/api/v1/users"), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("roleCodes"))
                .andExpect(jsonPath("$.errors[0].message").value("Vai trò không hợp lệ: HACKER"));
    }

    @Test
    void listFiltersByFullNameRoleAndStatusWithPagingAndSorting() throws Exception {
        String marker = unique("ds");
        createUser(marker + "b", "STAFF");
        createUser(marker + "a", "STAFF");
        createUser(marker + "c", "ACCOUNTANT");

        mvc.perform(get("/api/v1/users").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("fullName", marker.toUpperCase())
                        .param("role", "staff")
                        .param("status", "ACTIVE")
                        .param("sort", "username,asc")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].username").value(marker + "a"))
                .andExpect(jsonPath("$.content[1].username").value(marker + "b"))
                .andExpect(jsonPath("$.content[0].fullName").value("Người dùng " + marker + "a"))
                .andExpect(jsonPath("$.content[0].roles[0].code").value("STAFF"));

        mvc.perform(get("/api/v1/users").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("keyword", marker).param("size", "10").param("sort", "fullName,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content[0].username").value(marker + "c"));
    }

    @Test
    void invalidPagingParametersAreRejected() throws Exception {
        mvc.perform(get("/api/v1/users").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .param("sort", "passwordHash,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
        mvc.perform(get("/api/v1/users").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)).param("size", "1000"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void usersWithoutUserPermissionsGet403() throws Exception {
        String manager = unique("bqm");
        createUser(manager, "BUILDING_MANAGER");

        mvc.perform(get("/api/v1/users").header(HttpHeaders.AUTHORIZATION, bearer(login(manager))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void updateDetectsConcurrentEditsByVersion() throws Exception {
        AppUser target = createUser(unique("staff"), "STAFF");
        long version = json(mvc.perform(get("/api/v1/users/{id}", target.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))).andReturn()).get("version").asLong();
        Map<String, Object> body = new HashMap<>(Map.of("email", target.getEmail(), "fullName", "Trần Thị Bình",
                "jobTitle", "Lễ tân", "version", version));

        MvcResult updated = send(put("/api/v1/users/{id}", target.getId()), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.fullName").value("Trần Thị Bình"))
                .andExpect(jsonPath("$.profile.jobTitle").value("Lễ tân"))
                .andReturn();
        assertThat(json(updated).get("version").asLong()).isGreaterThan(version);

        body.put("fullName", "Ghi đè");
        send(put("/api/v1/users/{id}", target.getId()), body)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERSION_CONFLICT"));
    }

    @Test
    void lockingAUserBlocksLoginAndRevokesSessionsUntilUnlocked() throws Exception {
        AppUser target = createUser(unique("staff"), "STAFF");
        MvcResult session = loginResult(target.getUsername(), PASSWORD);

        send(patch("/api/v1/users/{id}/status", target.getId()), Map.of("status", "LOCKED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", target.getUsername(),
                                "password", PASSWORD))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
        mvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("bihome_refresh", session.getResponse().getCookie("bihome_refresh").getValue())))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(accessToken(session))))
                .andExpect(status().isUnauthorized());

        send(patch("/api/v1/users/{id}/status", target.getId()), Map.of("status", "ACTIVE"))
                .andExpect(status().isOk());
        loginResult(target.getUsername(), PASSWORD);
    }

    @Test
    void adminCannotChangeOwnStatusOrResetOwnPassword() throws Exception {
        send(patch("/api/v1/users/{id}/status", admin.getId()), Map.of("status", "INACTIVE"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE_VIOLATION"));
        send(post("/api/v1/users/{id}/reset-password", admin.getId()), Map.of())
                .andExpect(status().isUnprocessableEntity());
        send(put("/api/v1/users/{id}/roles", admin.getId()), Map.of("roleCodes", List.of("STAFF")))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void resetPasswordIssuesATemporaryPasswordAndInvalidatesTheOldOne() throws Exception {
        AppUser target = createUser(unique("staff"), "STAFF");

        String temporaryPassword = json(send(post("/api/v1/users/{id}/reset-password", target.getId()), Map.of())
                .andExpect(status().isOk()).andReturn()).get("temporaryPassword").asText();

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", target.getUsername(),
                                "password", PASSWORD))))
                .andExpect(status().isUnauthorized());
        assertThat(json(loginResult(target.getUsername(), temporaryPassword)).get("mustChangePassword").asBoolean())
                .isTrue();
    }

    @Test
    void assignRolesAndBuildings() throws Exception {
        AppUser target = createUser(unique("staff"), "STAFF");

        send(put("/api/v1/users/{id}/roles", target.getId()), Map.of("roleCodes", List.of("accountant")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[*].code", Matchers.contains("ACCOUNTANT")));
        send(put("/api/v1/users/{id}/buildings", target.getId()), Map.of("buildingIds", List.of(buildingB, buildingA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.buildingIds", Matchers.contains(buildingA, buildingB)));

        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(login(target.getUsername()))))
                .andExpect(jsonPath("$.permissions", Matchers.hasItem("FEE_NOTICE_WRITE")))
                .andExpect(jsonPath("$.buildingIds", Matchers.contains(buildingA, buildingB)));
    }

    @Test
    void unknownBuildingsAreRejected() throws Exception {
        AppUser target = createUser(unique("staff"), "STAFF");

        send(put("/api/v1/users/{id}/buildings", target.getId()), Map.of("buildingIds", List.of(buildingA, 987654)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("buildingIds"))
                .andExpect(jsonPath("$.errors[0].message").value("Tòa nhà không tồn tại: 987654"));
    }

    @Test
    void rolesEndpointListsSeededRoles() throws Exception {
        mvc.perform(get("/api/v1/roles").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", Matchers.contains("SUPER_ADMIN", "BUILDING_MANAGER", "STAFF",
                        "ACCOUNTANT", "RESIDENT")));
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private Map<String, Object> newUser(String username) {
        Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("email", username.toLowerCase() + "@bihome.test");
        body.put("phone", "09" + ThreadLocalRandom.current().nextInt(10_000_000, 99_999_999));
        body.put("fullName", "Nguyễn Văn An");
        body.put("gender", "MALE");
        body.put("jobTitle", "Kỹ thuật");
        body.put("roleCodes", List.of("STAFF"));
        body.put("buildingIds", List.of(buildingB, buildingA));
        return body;
    }
}
