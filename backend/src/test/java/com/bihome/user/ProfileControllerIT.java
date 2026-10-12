package com.bihome.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

class ProfileControllerIT extends AbstractIT {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    @Test
    void updateProfileChangesOwnFieldsButNotEmailOrUsername() throws Exception {
        AppUser user = createUser(unique("staff"), "STAFF");
        String token = login(user.getUsername());
        Map<String, Object> body = new HashMap<>(Map.of("fullName", "Lê Văn Cường", "jobTitle", "Bảo vệ",
                "gender", "MALE", "dateOfBirth", "1990-05-20", "phone", "+84987654321"));
        body.put("email", "hacker@evil.test");

        mvc.perform(put("/api/v1/profile").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.fullName").value("Lê Văn Cường"))
                .andExpect(jsonPath("$.profile.dateOfBirth").value("1990-05-20"))
                .andExpect(jsonPath("$.phone").value("0987654321"))
                .andExpect(jsonPath("$.email").value(user.getEmail()))
                .andExpect(jsonPath("$.username").value(user.getUsername()));
    }

    @Test
    void avatarMustBeAnAvatarUploadedByTheSameUser() throws Exception {
        AppUser owner = createUser(unique("staff"), "STAFF");
        String ownerToken = login(owner.getUsername());
        long avatarId = upload(ownerToken, "AVATAR", "a.png", PNG);

        mvc.perform(put("/api/v1/profile/avatar").header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fileId\":" + avatarId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.avatarFileId").value(avatarId))
                .andExpect(jsonPath("$.profile.avatarUrl").value("/api/v1/files/" + avatarId));

        String otherToken = login(createUser(unique("staff"), "STAFF").getUsername());
        mvc.perform(put("/api/v1/profile/avatar").header(HttpHeaders.AUTHORIZATION, bearer(otherToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fileId\":" + avatarId + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("fileId"));

        long documentId = upload(ownerToken, "DOCUMENT", "a.pdf", "%PDF-1.7 test".getBytes(StandardCharsets.US_ASCII));
        mvc.perform(put("/api/v1/profile/avatar").header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fileId\":" + documentId + "}"))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/api/v1/profile/avatar").header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fileId\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.avatarUrl").doesNotExist());
    }

    @Test
    void buildingHeaderIsCheckedAgainstAssignedBuildings() throws Exception {
        Long assigned = createBuilding().getId();
        Long other = createBuilding().getId();
        String staffToken = login(createUser(unique("staff"), Set.of(assigned), "STAFF").getUsername());

        mvc.perform(get("/api/v1/profile").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .header("X-Building-Id", assigned.toString()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/profile").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .header("X-Building-Id", other.toString()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("BUILDING_ACCESS_DENIED"));
        mvc.perform(get("/api/v1/profile").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .header("X-Building-Id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
        // Nhóm /auth không bị chặn để tòa đã chọn cũ không làm hỏng việc khởi động app.
        mvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(staffToken))
                        .header("X-Building-Id", other.toString()))
                .andExpect(status().isOk());

        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        mvc.perform(get("/api/v1/profile").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .header("X-Building-Id", "999"))
                .andExpect(status().isOk());
    }

    private long upload(String token, String purpose, String name, byte[] content) throws Exception {
        String body = mvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", name, "application/octet-stream", content))
                        .param("purpose", purpose)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("id").asLong();
    }
}
