package com.bihome.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;

class FileControllerIT extends AbstractIT {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    @Autowired
    FileAttachmentRepository repository;

    @Test
    void uploadThenDownloadRoundTripsBytesAndSetsAuditUser() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "anh-toa-nha.png", "image/png", PNG);
        // Đăng nhập thật: GET /files kiểm tra quyền theo AuthUser (người tải lên xem được tệp chưa gắn).
        String username = unique("uploader");
        String token = login(createUser(username, "STAFF").getUsername());

        String body = mvc.perform(multipart("/api/v1/files").file(file).param("purpose", "BUILDING_IMAGE")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.name").value("anh-toa-nha.png"))
                .andExpect(jsonPath("$.size").value(PNG.length))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        long id = objectMapper.readTree(body).get("id").asLong();

        FileAttachment saved = repository.findById(id).orElseThrow();
        assertThat(saved.getCreatedBy()).isEqualTo(username);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getStoredPath()).matches("building_image/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.png");

        mvc.perform(get("/api/v1/files/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(PNG))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("inline")));

        mvc.perform(get("/api/v1/files/{id}", id).param("download", "true").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")));
    }

    @Test
    void textFileRenamedToPngIsRejectedByMagicBytes() throws Exception {
        MockMultipartFile fake = new MockMultipartFile("file", "virus.png", "image/png",
                "not an image".getBytes(StandardCharsets.UTF_8));

        mvc.perform(multipart("/api/v1/files").file(fake).param("purpose", "AVATAR").with(user("admin")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_TYPE_NOT_ALLOWED"));
    }

    @Test
    void emptyFileIsRejected() throws Exception {
        MockMultipartFile empty = new MockMultipartFile("file", "a.png", "image/png", new byte[0]);

        mvc.perform(multipart("/api/v1/files").file(empty).param("purpose", "AVATAR").with(user("admin")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_EMPTY"));
    }

    @Test
    void oversizedImageIsRejectedWith413() throws Exception {
        byte[] big = new byte[6 * 1024 * 1024];
        System.arraycopy(PNG, 0, big, 0, PNG.length);

        mvc.perform(multipart("/api/v1/files").file(new MockMultipartFile("file", "big.png", "image/png", big))
                        .param("purpose", "AVATAR").with(user("admin")))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
    }

    @Test
    void unknownFileIdReturns404() throws Exception {
        mvc.perform(get("/api/v1/files/{id}", 999999).with(user("admin")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void anonymousAccessReturns401ProblemDetail() throws Exception {
        mvc.perform(get("/api/v1/files/{id}", 1))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }
}
