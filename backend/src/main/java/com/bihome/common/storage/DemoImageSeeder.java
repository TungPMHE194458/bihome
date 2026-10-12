package com.bihome.common.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Chỉ profile local: gắn ảnh demo (ảnh chụp Unsplash / randomuser.me ở classpath {@code demo-images/}, tải bằng
 * {@code backend/tools/download_demo_images.py}) cho tòa nhà, căn hộ, tiện ích, dịch vụ chưa có ảnh và cư dân chưa có
 * ảnh đại diện. Tệp đặt tên {@code <nhóm>-<n>.jpg}; các bản ghi cùng nhóm lần lượt dùng từng biến thể. Mỗi mục đích chỉ gắn một lần (đã có tệp {@code CREATED_BY = demo-seed} thì bỏ qua — người dùng gỡ ảnh
 * sẽ không bị gắn lại); tệp demo bị mất khỏi {@code storage/} thì chép lại. Ghi bằng JDBC nên không vào lịch sử hoạt động.
 */
@Slf4j
@Component
@Profile("local")
@ConditionalOnProperty(name = "bihome.demo-images.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoImageSeeder implements ApplicationRunner {

    static final String AUTHOR = "demo-seed";
    private static final String ROOT = "demo-images/";
    /** Số ảnh của mỗi nhóm (khớp PHOTOS / PORTRAITS trong download_demo_images.py). */
    private static final Map<String, Integer> VARIANTS = Map.ofEntries(
            Map.entry("tower", 2), Map.entry("riverside", 1), Map.entry("compound", 1), Map.entry("classic", 1),
            Map.entry("lobby", 1), Map.entry("city", 1),
            Map.entry("living", 5), Map.entry("bedroom", 4), Map.entry("kitchen", 2), Map.entry("penthouse", 2),
            Map.entry("villa", 6), Map.entry("shophouse", 1),
            Map.entry("pool", 2), Map.entry("gym", 2), Map.entry("bbq", 2), Map.entry("lounge", 1),
            Map.entry("cleaning", 1), Map.entry("sofa", 1), Map.entry("repair", 1), Map.entry("laundry", 1),
            Map.entry("concierge", 1), Map.entry("male", 4), Map.entry("female", 4));

    private final JdbcTemplate jdbc;
    private final StorageService storage;
    private final TransactionTemplate transaction;

    /** Bảng ảnh dạng danh sách (BUILDING_IMAGE...) hoặc cột ảnh đại diện (RESIDENT.AVATAR_FILE_ID). */
    private record Target(FilePurpose purpose, String kind, String selectSql, String imageTable, String ownerColumn,
                          String avatarTable, Function<Map<String, Object>, List<String>> pick) {
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            restoreMissingFiles();
            targets().forEach(this::seed);
        } catch (RuntimeException e) {
            log.warn("Không gắn được ảnh demo: {}", e.getMessage());
        }
    }

    private List<Target> targets() {
        return List.of(
                gallery(FilePurpose.BUILDING_IMAGE, "building",
                        "SELECT b.ID, b.TYPE, ROW_NUMBER() OVER (PARTITION BY b.TYPE ORDER BY b.ID) - 1 ROW_NO FROM BUILDING b"
                                + " WHERE NOT EXISTS (SELECT 1 FROM BUILDING_IMAGE i WHERE i.BUILDING_ID = b.ID)",
                        "BUILDING_IMAGE", "BUILDING_ID", DemoImageSeeder::buildingImages),
                gallery(FilePurpose.APARTMENT_IMAGE, "apartment",
                        "SELECT a.ID, a.TYPE, ROW_NUMBER() OVER (ORDER BY a.BUILDING_ID, a.CODE) - 1 ROW_NO FROM APARTMENT a"
                                + " WHERE NOT EXISTS (SELECT 1 FROM APARTMENT_IMAGE i WHERE i.APARTMENT_ID = a.ID)",
                        "APARTMENT_IMAGE", "APARTMENT_ID", DemoImageSeeder::apartmentImages),
                gallery(FilePurpose.AMENITY_IMAGE, "amenity",
                        "SELECT a.ID, a.CODE || ' ' || a.NAME TEXT, ROW_NUMBER() OVER (ORDER BY a.ID) - 1 ROW_NO FROM AMENITY a"
                                + " WHERE NOT EXISTS (SELECT 1 FROM AMENITY_IMAGE i WHERE i.AMENITY_ID = a.ID)",
                        "AMENITY_IMAGE", "AMENITY_ID", row -> galleryOf(amenityImage(text(row)), no(row))),
                gallery(FilePurpose.SERVICE_IMAGE, "service",
                        "SELECT s.ID, s.NAME || ' ' || t.NAME TEXT FROM SERVICE s JOIN SERVICE_TYPE t ON t.ID = s.SERVICE_TYPE_ID"
                                + " WHERE NOT EXISTS (SELECT 1 FROM SERVICE_IMAGE i WHERE i.SERVICE_ID = s.ID)",
                        "SERVICE_IMAGE", "SERVICE_ID", row -> List.of(variant(serviceImage(text(row)), 0))),
                new Target(FilePurpose.RESIDENT_AVATAR, "resident",
                        "SELECT r.ID, r.GENDER, ROW_NUMBER() OVER (PARTITION BY r.GENDER ORDER BY r.ID) - 1 ROW_NO"
                                + " FROM RESIDENT r WHERE r.AVATAR_FILE_ID IS NULL",
                        null, null, "RESIDENT",
                        row -> List.of(variant("FEMALE".equals(row.get("GENDER")) ? "female" : "male", no(row)))));
    }

    private static Target gallery(FilePurpose purpose, String kind, String sql, String table, String ownerColumn,
                                  Function<Map<String, Object>, List<String>> pick) {
        return new Target(purpose, kind, sql, table, ownerColumn, null, pick);
    }

    /** Tên tệp (không đuôi) của biến thể thứ n trong nhóm, xoay vòng. */
    static String variant(String group, int n) {
        return group + "-" + (n % VARIANTS.getOrDefault(group, 1) + 1);
    }

    /** Mọi ảnh của nhóm, bắt đầu từ biến thể thứ n làm ảnh đại diện. */
    private static List<String> galleryOf(String group, int n) {
        return IntStream.range(0, VARIANTS.getOrDefault(group, 1)).mapToObj(i -> variant(group, n + i)).toList();
    }

    static List<String> buildingImages(Map<String, Object> row) {
        int n = no(row);
        return switch (String.valueOf(row.get("TYPE"))) {
            case "COMPOUND" -> List.of(variant("compound", n), variant("lobby", 0));
            case "RENTAL" -> List.of(variant("riverside", n), variant("city", 0), variant("lobby", 0));
            default -> n % 2 == 0
                    ? List.of(variant("classic", 0), variant("lobby", 0))
                    : List.of(variant("tower", 0), variant("tower", 1), variant("city", 0), variant("lobby", 0));
        };
    }

    static List<String> apartmentImages(Map<String, Object> row) {
        int n = no(row);
        String living = variant("living", n);
        String bedroom = variant("bedroom", n);
        String kitchen = variant("kitchen", n);
        return switch (String.valueOf(row.get("TYPE"))) {
            case "PENTHOUSE" -> List.of(variant("penthouse", n), variant("penthouse", n + 1), bedroom, kitchen);
            case "VILLA" -> List.of(variant("villa", n), living, bedroom, kitchen);
            case "SHOPHOUSE", "PREMISES", "OFFICE" -> List.of(variant("shophouse", n));
            default -> List.of(living, bedroom, kitchen);
        };
    }

    static String amenityImage(String text) {
        if (text.contains("pool") || text.contains("bơi")) return "pool";
        if (text.contains("gym") || text.contains("thể hình")) return "gym";
        if (text.contains("bbq") || text.contains("nướng")) return "bbq";
        return "lounge";
    }

    static String serviceImage(String text) {
        if (text.contains("sofa")) return "sofa";
        if (text.contains("giặt")) return "laundry";
        if (text.contains("sửa") || text.contains("điện") || text.contains("nước")) return "repair";
        if (text.contains("vệ sinh") || text.contains("dọn")) return "cleaning";
        return "concierge";
    }

    private static String text(Map<String, Object> row) {
        return String.valueOf(row.get("TEXT")).toLowerCase(Locale.ROOT);
    }

    private static int no(Map<String, Object> row) {
        return ((Number) row.get("ROW_NO")).intValue();
    }

    private void seed(Target target) {
        Integer seeded = jdbc.queryForObject("SELECT COUNT(*) FROM FILE_ATTACHMENT WHERE CREATED_BY = ? AND PURPOSE = ?",
                Integer.class, AUTHOR, target.purpose().name());
        if (seeded != null && seeded > 0) {
            return;
        }
        List<Map<String, Object>> rows = jdbc.queryForList(target.selectSql());
        if (rows.isEmpty()) {
            return;
        }
        List<String> written = new ArrayList<>();
        try {
            transaction.executeWithoutResult(status -> {
                for (Map<String, Object> row : rows) {
                    long ownerId = ((Number) row.get("ID")).longValue();
                    List<String> names = target.pick().apply(row);
                    for (int i = 0; i < names.size(); i++) {
                        String source = target.kind() + "/" + names.get(i) + ".jpg";
                        String path = "%s/demo/%s-%d-%d.jpg".formatted(target.purpose().name().toLowerCase(Locale.ROOT),
                                names.get(i), ownerId, i);
                        long size = copy(source, path);
                        written.add(path);
                        long fileId = insertAttachment(target, source, path, size);
                        if (target.avatarTable() != null) {
                            jdbc.update("UPDATE " + target.avatarTable() + " SET AVATAR_FILE_ID = ? WHERE ID = ?", fileId, ownerId);
                        } else {
                            jdbc.update("INSERT INTO " + target.imageTable() + " (" + target.ownerColumn()
                                    + ", FILE_ID, IS_COVER, SORT_ORDER) VALUES (?, ?, ?, ?)", ownerId, fileId, i == 0 ? 1 : 0, i);
                        }
                    }
                }
            });
            log.info("Đã gắn ảnh demo ({}) cho {} bản ghi", target.purpose(), rows.size());
        } catch (RuntimeException e) {
            written.forEach(storage::delete);
            throw e;
        }
    }

    private long insertAttachment(Target target, String source, String path, long size) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("INSERT INTO FILE_ATTACHMENT (ORIGINAL_NAME, STORED_PATH, FILE_SIZE,"
                    + " CONTENT_TYPE, PURPOSE, CREATED_AT, UPDATED_AT, CREATED_BY, UPDATED_BY)"
                    + " VALUES (?, ?, ?, 'image/jpeg', ?, SYSTIMESTAMP, SYSTIMESTAMP, ?, ?)", new String[] {"ID"});
            ps.setString(1, source.replace('/', '-'));
            ps.setString(2, path);
            ps.setLong(3, size);
            ps.setString(4, target.purpose().name());
            ps.setString(5, AUTHOR);
            ps.setString(6, AUTHOR);
            return ps;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    /** Thư mục storage/ bị xoá mà DB còn: chép lại tệp demo theo ORIGINAL_NAME ({kind}-{tên}.jpg). */
    private void restoreMissingFiles() {
        List<Map<String, Object>> files = jdbc.queryForList(
                "SELECT ORIGINAL_NAME, STORED_PATH FROM FILE_ATTACHMENT WHERE CREATED_BY = ?", AUTHOR);
        int restored = 0;
        for (Map<String, Object> f : files) {
            String path = (String) f.get("STORED_PATH");
            if (exists(path)) {
                continue;
            }
            copy(((String) f.get("ORIGINAL_NAME")).replaceFirst("-", "/"), path);
            restored++;
        }
        if (restored > 0) {
            log.info("Đã chép lại {} tệp ảnh demo bị thiếu", restored);
        }
    }

    private boolean exists(String path) {
        try {
            return storage.load(path).exists();
        } catch (RuntimeException e) {
            return false;
        }
    }

    private long copy(String source, String path) {
        ClassPathResource resource = new ClassPathResource(ROOT + source);
        try (InputStream in = resource.getInputStream()) {
            storage.store(path, in);
            return resource.contentLength();
        } catch (IOException e) {
            throw new UncheckedIOException("Thiếu ảnh demo " + source, e);
        }
    }
}
