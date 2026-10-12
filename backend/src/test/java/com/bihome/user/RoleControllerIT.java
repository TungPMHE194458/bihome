package com.bihome.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class RoleControllerIT extends AbstractIT {

    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
    }

    @Test
    void overviewListsSystemRolesAndThePermissionCatalog() throws Exception {
        mvc.perform(get("/api/v1/roles/overview").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'SUPER_ADMIN')].allPermissions").value(true))
                .andExpect(jsonPath("$[?(@.code == 'STAFF')].permissions[*]", Matchers.hasItem("TICKET_WRITE")));
        mvc.perform(get("/api/v1/permissions").header(HttpHeaders.AUTHORIZATION, bearer(adminToken)))
                .andExpect(jsonPath("$.length()").value(104))
                .andExpect(jsonPath("$[?(@.code == 'AUDIT_LOG_READ')].module").value("AUDIT_LOG"));

        String manager = login(createUser(unique("bqm"), "BUILDING_MANAGER").getUsername());
        mvc.perform(get("/api/v1/roles/overview").header(HttpHeaders.AUTHORIZATION, bearer(manager)))
                .andExpect(status().isForbidden());
    }

    @Test
    void customRolesGrantPermissionsImmediatelyAndCannotBeDeletedWhileAssigned() throws Exception {
        String code = ("GUARD_" + unique("")).toUpperCase();
        JsonNode role = json(send(post("/api/v1/roles"), Map.of("code", code, "name", "Bảo vệ",
                "permissions", List.of("RESIDENT_READ"))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.system").value(false)));
        send(post("/api/v1/roles"), Map.of("code", code, "name", "Trùng", "permissions", List.of()))
                .andExpect(status().isConflict());
        send(post("/api/v1/roles"), Map.of("code", unique("X").toUpperCase(), "name", "Sai quyền",
                "permissions", List.of("NOT_A_PERMISSION"))).andExpect(status().isBadRequest());

        Building tower = createBuilding();
        AppUser guard = createUser(unique("bv"), Set.of(tower.getId()), code);
        String guardToken = login(guard.getUsername());
        mvc.perform(get("/api/v1/residents").header(HttpHeaders.AUTHORIZATION, bearer(guardToken)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/tickets").header(HttpHeaders.AUTHORIZATION, bearer(guardToken)))
                .andExpect(status().isForbidden());

        send(put("/api/v1/roles/{id}", role.get("id").asLong()), Map.of("name", "Bảo vệ ca đêm",
                "permissions", List.of("RESIDENT_READ", "TICKET_READ"), "version", role.get("version").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userCount").value(1));
        mvc.perform(get("/api/v1/tickets").header(HttpHeaders.AUTHORIZATION, bearer(guardToken)))
                .andExpect(status().isOk());

        send(delete("/api/v1/roles/{id}", role.get("id").asLong()), null).andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Vai trò đang được gán cho 1 người dùng, hãy gỡ vai trò khỏi họ trước."));
        send(put("/api/v1/users/{id}/roles", guard.getId()), Map.of("roleCodes", List.of("STAFF"))).andExpect(status().isOk());
        send(delete("/api/v1/roles/{id}", role.get("id").asLong()), null).andExpect(status().isNoContent());
    }

    @Test
    void superAdminRoleIsReadOnlyAndSystemRolesCannotBeDeleted() throws Exception {
        long superAdmin = roleRepository.findByCodeIn(Set.of("SUPER_ADMIN")).getFirst().getId();
        Role staff = roleRepository.findByCodeIn(Set.of("STAFF")).getFirst();
        send(put("/api/v1/roles/{id}", superAdmin), Map.of("name", "Admin", "permissions", List.of(), "version", 0))
                .andExpect(status().isConflict());
        send(delete("/api/v1/roles/{id}", staff.getId()), null).andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Vai trò hệ thống không xoá được."));
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, bearer(adminToken));
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
