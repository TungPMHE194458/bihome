package com.bihome.common.storage;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Nhận diện loại tệp bằng magic bytes, không tin phần mở rộng do client gửi (trừ khi phải phân biệt doc/xls/ppt cũ). */
public final class FileTypeDetector {

    private static final int MAX_ZIP_ENTRIES = 5000;

    private FileTypeDetector() {
    }

    public static Optional<DetectedFileType> detect(byte[] data, String originalName) {
        if (startsWith(data, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(DetectedFileType.JPEG);
        }
        if (startsWith(data, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of(DetectedFileType.PNG);
        }
        if (isWebp(data)) {
            return Optional.of(DetectedFileType.WEBP);
        }
        if (startsWith(data, '%', 'P', 'D', 'F', '-')) {
            return Optional.of(DetectedFileType.PDF);
        }
        if (startsWith(data, 0x50, 0x4B, 0x03, 0x04)) {
            return detectOoxml(data);
        }
        if (startsWith(data, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1)) {
            return detectLegacyOffice(originalName);
        }
        return Optional.empty();
    }

    private static boolean isWebp(byte[] data) {
        return data.length >= 12
                && startsWith(data, 'R', 'I', 'F', 'F')
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P';
    }

    private static Optional<DetectedFileType> detectOoxml(byte[] data) {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(data), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            int count = 0;
            while ((entry = zip.getNextEntry()) != null && count++ < MAX_ZIP_ENTRIES) {
                switch (entry.getName()) {
                    case "word/document.xml" -> {
                        return Optional.of(DetectedFileType.DOCX);
                    }
                    case "xl/workbook.xml" -> {
                        return Optional.of(DetectedFileType.XLSX);
                    }
                    case "ppt/presentation.xml" -> {
                        return Optional.of(DetectedFileType.PPTX);
                    }
                    default -> {
                    }
                }
            }
        } catch (IOException | IllegalArgumentException e) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private static Optional<DetectedFileType> detectLegacyOffice(String originalName) {
        String name = originalName == null ? "" : originalName.toLowerCase(Locale.ROOT);
        if (name.endsWith(".doc")) {
            return Optional.of(DetectedFileType.DOC);
        }
        if (name.endsWith(".xls")) {
            return Optional.of(DetectedFileType.XLS);
        }
        if (name.endsWith(".ppt")) {
            return Optional.of(DetectedFileType.PPT);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((data[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
