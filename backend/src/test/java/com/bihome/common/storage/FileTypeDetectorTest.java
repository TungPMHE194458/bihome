package com.bihome.common.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;

class FileTypeDetectorTest {

    private static byte[] bytes(int... values) {
        byte[] out = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            out[i] = (byte) values[i];
        }
        return out;
    }

    private static byte[] zipWith(String entryName) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("[Content_Types].xml"));
            zip.write("<x/>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write("<x/>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    @Test
    void detectsImagesByMagicBytes() {
        assertThat(FileTypeDetector.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0), "a.png")).contains(DetectedFileType.JPEG);
        assertThat(FileTypeDetector.detect(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0), "a.jpg"))
                .contains(DetectedFileType.PNG);
        assertThat(FileTypeDetector.detect(
                bytes('R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'), "a.png")).contains(DetectedFileType.WEBP);
    }

    @Test
    void detectsPdf() {
        assertThat(FileTypeDetector.detect("%PDF-1.7 ...".getBytes(StandardCharsets.US_ASCII), "x.docx"))
                .contains(DetectedFileType.PDF);
    }

    @Test
    void detectsOoxmlByZipContentNotExtension() throws Exception {
        assertThat(FileTypeDetector.detect(zipWith("word/document.xml"), "x.xlsx")).contains(DetectedFileType.DOCX);
        assertThat(FileTypeDetector.detect(zipWith("xl/workbook.xml"), "x.docx")).contains(DetectedFileType.XLSX);
        assertThat(FileTypeDetector.detect(zipWith("ppt/presentation.xml"), "x.pdf")).contains(DetectedFileType.PPTX);
    }

    @Test
    void plainZipIsRejected() throws Exception {
        assertThat(FileTypeDetector.detect(zipWith("readme.txt"), "x.docx")).isEmpty();
    }

    @Test
    void legacyOfficeUsesExtensionOnlyToTellFormatsApart() {
        byte[] ole2 = bytes(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0, 0);
        assertThat(FileTypeDetector.detect(ole2, "a.DOC")).contains(DetectedFileType.DOC);
        assertThat(FileTypeDetector.detect(ole2, "a.xls")).contains(DetectedFileType.XLS);
        assertThat(FileTypeDetector.detect(ole2, "a.ppt")).contains(DetectedFileType.PPT);
        assertThat(FileTypeDetector.detect(ole2, "a.exe")).isEmpty();
    }

    @Test
    void textAndExecutablesAreRejectedEvenWithImageExtension() {
        assertThat(FileTypeDetector.detect("hello".getBytes(StandardCharsets.UTF_8), "a.png")).isEmpty();
        assertThat(FileTypeDetector.detect(bytes('M', 'Z', 0x90, 0), "a.jpg")).isEmpty();
        assertThat(FileTypeDetector.detect(new byte[0], "a.jpg")).isEmpty();
    }

    @Test
    void purposeRulesRestrictTypes() {
        assertThat(FilePurpose.AVATAR.allows(DetectedFileType.PDF)).isFalse();
        assertThat(FilePurpose.AVATAR.allows(DetectedFileType.WEBP)).isTrue();
        assertThat(FilePurpose.DOCUMENT.allows(DetectedFileType.PDF)).isTrue();
        assertThat(FilePurpose.DOCUMENT.allows(DetectedFileType.WEBP)).isFalse();
        assertThat(FilePurpose.AVATAR.maxBytes()).isEqualTo(5L * 1024 * 1024);
        assertThat(FilePurpose.DOCUMENT.maxBytes()).isEqualTo(20L * 1024 * 1024);
    }
}
