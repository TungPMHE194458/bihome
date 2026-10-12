package com.bihome.setting;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class SettingControllerIT extends AbstractIT {

    @Autowired
    SettingService settingService;

    private String admin;

    @BeforeEach
    void setUp() throws Exception {
        admin = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
    }

    /** CSDL dùng chung giữa các lớp test: trả về mặc định (5 lần / 15 phút) để test đăng nhập khác không bị ảnh hưởng. */
    @AfterEach
    void restoreDefaults() throws Exception {
        JsonNode current = json(mvc.perform(get("/api/v1/settings").header(HttpHeaders.AUTHORIZATION, bearer(admin))));
        save(body(5, 15, "", current.get("version").asLong()));
    }

    @Test
    void adminUpdatesSettingsAndLoginPolicyAppliesImmediately() throws Exception {
        JsonNode current = json(mvc.perform(get("/api/v1/settings").header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(jsonPath("$.maxFailedLogins").value(5))
                .andExpect(jsonPath("$.feeNoticeEmail").value(true)));

        Map<String, Object> bad = body(2, 15, "Công ty Quản lý BiHome", current.get("version").asLong());
        bad.put("taxCode", "123");
        save(bad).andExpect(status().isBadRequest());

        save(body(3, 30, "Công ty Quản lý BiHome", current.get("version").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("Công ty Quản lý BiHome"))
                .andExpect(jsonPath("$.lockMinutes").value(30));
        save(body(3, 30, "Cũ", current.get("version").asLong())).andExpect(status().isConflict());

        // Sai mật khẩu 3 lần (theo cấu hình mới) → tạm khoá.
        String username = createUser(unique("nv"), Set.of(), "STAFF").getUsername();
        for (int i = 0; i < 2; i++) {
            badLogin(username).andExpect(status().isUnauthorized());
        }
        badLogin(username).andExpect(status().isLocked())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("sai quá 3 lần")));

        // Trưởng BQL chỉ có quyền xem.
        String manager = login(createUser(unique("bql"), Set.of(createBuilding().getId()), "BUILDING_MANAGER").getUsername());
        mvc.perform(get("/api/v1/settings").header(HttpHeaders.AUTHORIZATION, bearer(manager))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/settings").header(HttpHeaders.AUTHORIZATION, bearer(manager))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body(5, 15, "", 0))))
                .andExpect(status().isForbidden());
    }

    private Map<String, Object> body(int logins, int minutes, String company, long version) {
        Map<String, Object> m = new HashMap<>();
        m.put("companyName", company);
        m.put("taxCode", company.isEmpty() ? "" : "0101234567");
        m.put("address", "");
        m.put("hotline", company.isEmpty() ? "" : "1900 1234");
        m.put("email", company.isEmpty() ? "" : "bql@bihome.vn");
        m.put("website", "");
        m.put("documentFooter", "");
        m.put("maxFailedLogins", logins);
        m.put("lockMinutes", minutes);
        m.put("feeNoticeEmail", true);
        m.put("version", version);
        return m;
    }

    private ResultActions save(Map<String, Object> body) throws Exception {
        return mvc.perform(put("/api/v1/settings").header(HttpHeaders.AUTHORIZATION, bearer(admin))
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions badLogin(String username) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username", username, "password", "Sai@12345"))));
    }

    private JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
