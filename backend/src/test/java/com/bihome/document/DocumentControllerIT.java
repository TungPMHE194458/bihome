package com.bihome.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bihome.AbstractIT;
import com.bihome.building.Building;
import com.bihome.common.storage.FileAttachment;
import com.bihome.common.storage.FileAttachmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class DocumentControllerIT extends AbstractIT {

    private static final byte[] PDF = "%PDF-1.4\n% BiHome test\n".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};

    @Autowired
    FileAttachmentRepository fileRepository;

    private Building tower;
    private String token;
    private long categoryId;

    @BeforeEach
    void setUp() throws Exception {
        tower = createBuilding();
        token = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        categoryId = id(createCategory(unique("Nội quy "), "#dc2626"));
    }

    @Test
    void defaultCategoriesAreSeededAndNamesAreUniqueIgnoringCase() throws Exception {
        mvc.perform(get("/api/v1/document-categories/options").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].name", Matchers.hasItems("Biểu mẫu", "Hợp đồng mẫu", "Hướng dẫn", "Nội quy",
                        "Thông báo")));
        createCategory("NỘI QUY", "#000000")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("name"));
        createCategory(unique("Màu sai "), "red")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("color"));
    }

    @Test
    void createGeneratesNumericCodesAndReturnsFileAndCategoryInfo() throws Exception {
        Map<String, Object> body = documentBody(upload("noi-quy.pdf", PDF), "Nội quy cư dân");
        body.put("tags", List.of(" nội  quy ", "Nội quy", "PCCC"));
        create(body).andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("1"))
                .andExpect(jsonPath("$.buildingId").value(tower.getId()))
                .andExpect(jsonPath("$.fileName").value("noi-quy.pdf"))
                .andExpect(jsonPath("$.fileSize").value(PDF.length))
                .andExpect(jsonPath("$.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.categoryColor").value("#DC2626"))
                .andExpect(jsonPath("$.fileVersionNo").value(1))
                .andExpect(jsonPath("$.tags", Matchers.contains("nội quy", "PCCC")));
        create(documentBody(upload("mau.png", PNG), "Ảnh mẫu")).andExpect(jsonPath("$.code").value("2"));

        Map<String, Object> custom = documentBody(upload("hd.pdf", PDF), "Hợp đồng");
        custom.put("code", "hd-01");
        create(custom).andExpect(jsonPath("$.code").value("HD-01"));
        Map<String, Object> duplicate = documentBody(upload("hd2.pdf", PDF), "Hợp đồng 2");
        duplicate.put("code", "HD-01");
        create(duplicate).andExpect(status().isConflict()).andExpect(jsonPath("$.errors[0].field").value("code"));
    }

    @Test
    void filesMustBeOwnDocumentUploadsAndUsedOnce() throws Exception {
        long fileId = upload("a.pdf", PDF);
        create(documentBody(fileId, "A")).andExpect(status().isCreated());
        create(documentBody(fileId, "B"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Tệp đã được dùng cho tài liệu khác."));

        String other = login(createUser(unique("bqm"), Set.of(tower.getId()), "BUILDING_MANAGER").getUsername());
        long foreignFile = upload(other, "b.pdf", PDF, "DOCUMENT");
        create(documentBody(foreignFile, "C")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("fileId"));
        long avatar = upload(token, "x.png", PNG, "AVATAR");
        create(documentBody(avatar, "D")).andExpect(status().isBadRequest());
    }

    @Test
    void listFiltersByTagAudienceCategoryAndSortsBySize() throws Exception {
        long otherCategory = id(createCategory(unique("Biểu mẫu "), "#16a34a"));
        Map<String, Object> a = documentBody(upload("a.pdf", PDF), "Nội quy hồ bơi");
        a.put("tags", List.of("Tiện ích", "Hồ bơi"));
        create(a);
        Map<String, Object> b = documentBody(upload("b.png", PNG), "Đơn đăng ký xe");
        b.put("categoryId", otherCategory);
        b.put("audience", "MANAGEMENT");
        b.put("tags", List.of("Gửi xe"));
        create(b);

        list(Map.of("tag", "hồ")).andExpect(jsonPath("$.content[*].name", Matchers.contains("Nội quy hồ bơi")));
        list(Map.of("audience", "MANAGEMENT")).andExpect(jsonPath("$.content[*].name", Matchers.contains("Đơn đăng ký xe")));
        list(Map.of("categoryId", String.valueOf(otherCategory))).andExpect(jsonPath("$.totalElements").value(1));
        list(Map.of("keyword", "đăng ký")).andExpect(jsonPath("$.totalElements").value(1));
        list(Map.of("sort", "fileSize,asc"))
                .andExpect(jsonPath("$.content[*].name", Matchers.contains("Đơn đăng ký xe", "Nội quy hồ bơi")));
        mvc.perform(get("/api/v1/documents/tags").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-Building-Id", tower.getId().toString()).param("keyword", "ti"))
                .andExpect(jsonPath("$", Matchers.contains("Tiện ích")));
    }

    @Test
    void replacingTheFileKeepsOldVersionsDownloadable() throws Exception {
        JsonNode created = json(create(documentBody(upload("v1.pdf", PDF), "Biểu phí")).andReturn());
        long id = created.get("id").asLong();
        long newFile = upload("v2.png", PNG);

        send(post("/api/v1/documents/{id}/file", id),
                Map.of("fileId", newFile, "note", "Cập nhật biểu phí 2027", "version", created.get("version").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("v2.png"))
                .andExpect(jsonPath("$.fileVersionNo").value(2));

        JsonNode versions = json(mvc.perform(get("/api/v1/documents/{id}/versions", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[0].current").value(true))
                .andExpect(jsonPath("$[0].versionNo").value(2))
                .andExpect(jsonPath("$[1].versionNo").value(1))
                .andExpect(jsonPath("$[1].fileName").value("v1.pdf"))
                .andExpect(jsonPath("$[1].note").value("Cập nhật biểu phí 2027"))
                .andExpect(jsonPath("$[1].replacedBy").isNotEmpty())
                .andReturn());

        mvc.perform(get("/api/v1/documents/{id}/content", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(content().bytes(PNG))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.startsWith("inline")));
        mvc.perform(get("/api/v1/documents/{id}/versions/{v}/content", id, versions.get(1).get("id").asLong())
                        .param("download", "true").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(content().bytes(PDF))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.startsWith("attachment")));

        // Thay file với version cũ → xung đột.
        send(post("/api/v1/documents/{id}/file", id),
                Map.of("fileId", upload("v3.pdf", PDF), "version", created.get("version").asLong()))
                .andExpect(status().isConflict());
    }

    @Test
    void updateChangesMetadataButNotTheFile() throws Exception {
        JsonNode created = json(create(documentBody(upload("a.pdf", PDF), "Tên cũ")).andReturn());
        Map<String, Object> body = documentBody(upload("ignored.png", PNG), "Tên mới");
        body.put("code", "");
        body.put("tags", List.of("Mới"));
        body.put("version", created.get("version").asLong());

        send(put("/api/v1/documents/{id}", created.get("id").asLong()), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tên mới"))
                .andExpect(jsonPath("$.code").value(created.get("code").asText()))
                .andExpect(jsonPath("$.fileName").value("a.pdf"))
                .andExpect(jsonPath("$.tags", Matchers.contains("Mới")));
    }

    @Test
    void deletingADocumentRemovesItsStoredFiles() throws Exception {
        long v1 = upload("a.pdf", PDF);
        JsonNode created = json(create(documentBody(v1, "Xoá thử")).andReturn());
        long id = created.get("id").asLong();
        long v2 = upload("b.pdf", PDF);
        send(post("/api/v1/documents/{id}/file", id), Map.of("fileId", v2, "version", created.get("version").asLong()));
        FileAttachment first = fileRepository.findById(v1).orElseThrow();
        assertThat(Files.exists(STORAGE_ROOT.resolve(first.getStoredPath()))).isTrue();

        mvc.perform(delete("/api/v1/documents/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());

        assertThat(fileRepository.findById(v2)).isEmpty();
        assertThat(fileRepository.findById(first.getId())).isEmpty();
        assertThat(Files.exists(STORAGE_ROOT.resolve(first.getStoredPath()))).isFalse();
        mvc.perform(get("/api/v1/documents/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void categoryInUseCannotBeDeletedAndInactiveCategoryCannotBeChosen() throws Exception {
        create(documentBody(upload("a.pdf", PDF), "Có danh mục"));
        mvc.perform(delete("/api/v1/document-categories/{id}", categoryId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Danh mục đang có 1 tài liệu, hãy chuyển sang Ngừng hoạt động."));

        send(patch("/api/v1/document-categories/{id}/status", categoryId), Map.of("status", "INACTIVE"))
                .andExpect(status().isOk());
        create(documentBody(upload("b.pdf", PDF), "Danh mục ngừng"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("categoryId"));
        mvc.perform(get("/api/v1/document-categories/options").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$[*].id", Matchers.not(Matchers.hasItem((int) categoryId))));

        long empty = id(createCategory(unique("Trống "), "#123456"));
        mvc.perform(delete("/api/v1/document-categories/{id}", empty).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    @Test
    void documentsOfOtherBuildingsAreHidden() throws Exception {
        Building other = createBuilding();
        String adminToken = login(createUser(unique("admin"), "SUPER_ADMIN").getUsername());
        long fileId = upload(adminToken, "x.pdf", PDF, "DOCUMENT");
        long foreign = id(mvc.perform(post("/api/v1/documents").header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                .header("X-Building-Id", other.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(documentBody(fileId, "Tài liệu tòa khác")))));

        mvc.perform(get("/api/v1/documents/{id}", foreign).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/documents/{id}/content", foreign).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound());
        list(Map.of()).andExpect(jsonPath("$.totalElements").value(0));
    }

    // ---------------------------------------------------------------- helpers

    private long upload(String name, byte[] data) throws Exception {
        return upload(token, name, data, "DOCUMENT");
    }

    private long upload(String bearerToken, String name, byte[] data, String purpose) throws Exception {
        MvcResult result = mvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", name, "application/octet-stream", data))
                        .param("purpose", purpose)
                        .header(HttpHeaders.AUTHORIZATION, bearer(bearerToken)))
                .andExpect(status().isCreated())
                .andReturn();
        return json(result).get("id").asLong();
    }

    private ResultActions createCategory(String name, String color) throws Exception {
        return send(post("/api/v1/document-categories"), Map.of("name", name, "color", color, "status", "ACTIVE"));
    }

    private ResultActions create(Map<String, Object> body) throws Exception {
        return send(post("/api/v1/documents"), body);
    }

    private ResultActions send(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions list(Map<String, String> params) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/documents")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("X-Building-Id", tower.getId().toString());
        params.forEach(request::param);
        return mvc.perform(request);
    }

    private long id(ResultActions actions) throws Exception {
        return json(actions.andReturn()).get("id").asLong();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private Map<String, Object> documentBody(long fileId, String name) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("categoryId", categoryId);
        body.put("audience", "ALL_RESIDENTS");
        body.put("tags", List.of());
        body.put("fileId", fileId);
        return body;
    }
}
