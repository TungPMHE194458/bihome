package com.bihome.common.storage;

import com.bihome.common.exception.NotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class LocalStorageService implements StorageService {

    private final Path root;

    public LocalStorageService(@Value("${bihome.storage.root}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    @Override
    public void store(String relativePath, InputStream content) {
        Path target = resolve(relativePath);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new StorageException("Không thể ghi tệp: " + relativePath, e);
        }
    }

    @Override
    public Resource load(String relativePath) {
        Path target = resolve(relativePath);
        if (!Files.isRegularFile(target)) {
            throw new NotFoundException("Không tìm thấy tệp.");
        }
        return new FileSystemResource(target);
    }

    @Override
    public void delete(String relativePath) {
        try {
            Files.deleteIfExists(resolve(relativePath));
        } catch (IOException e) {
            throw new StorageException("Không thể xoá tệp: " + relativePath, e);
        }
    }

    private Path resolve(String relativePath) {
        Path target = root.resolve(relativePath).normalize();
        if (!target.startsWith(root) || target.equals(root)) {
            throw new StorageException("Đường dẫn tệp không hợp lệ.");
        }
        return target;
    }
}
