package com.bihome.common.storage;

import java.io.InputStream;
import org.springframework.core.io.Resource;

/** Lưu trữ tệp theo đường dẫn tương đối; hiện dùng đĩa local, sau này có thể thay bằng MinIO/S3. */
public interface StorageService {

    void store(String relativePath, InputStream content);

    Resource load(String relativePath);

    void delete(String relativePath);
}
