package com.bihome.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bihome.common.exception.NotFoundException;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;

class LocalStorageServiceTest {

    @TempDir
    Path tempDir;

    LocalStorageService storage;

    @BeforeEach
    void setUp() {
        storage = new LocalStorageService(tempDir.toString());
    }

    @Test
    void storeThenLoadReturnsSameBytes() throws Exception {
        storage.store("avatar/2026/10/a.png", new ByteArrayInputStream(new byte[]{1, 2, 3}));

        Resource resource = storage.load("avatar/2026/10/a.png");

        assertThat(resource.getContentAsByteArray()).containsExactly(1, 2, 3);
        assertThat(Files.exists(tempDir.resolve("avatar/2026/10/a.png"))).isTrue();
    }

    @Test
    void deleteRemovesFileAndIsIdempotent() {
        storage.store("document/x.pdf", new ByteArrayInputStream(new byte[]{9}));

        storage.delete("document/x.pdf");
        storage.delete("document/x.pdf");

        assertThatThrownBy(() -> storage.load("document/x.pdf")).isInstanceOf(NotFoundException.class);
    }

    @Test
    void loadMissingFileThrowsNotFound() {
        assertThatThrownBy(() -> storage.load("nope/none.png")).isInstanceOf(NotFoundException.class);
    }

    @Test
    void pathTraversalIsRejected() {
        assertThatThrownBy(() -> storage.store("../escape.txt", new ByteArrayInputStream(new byte[]{1})))
                .isInstanceOf(StorageException.class);
        assertThatThrownBy(() -> storage.load("a/../../escape.txt")).isInstanceOf(StorageException.class);
        assertThat(Files.exists(tempDir.getParent().resolve("escape.txt"))).isFalse();
    }

    @Test
    void storageRootItselfCannotBeTargeted() {
        assertThatThrownBy(() -> storage.delete("")).isInstanceOf(StorageException.class);
    }
}
