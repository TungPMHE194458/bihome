package com.bihome.common.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class DemoImageSeederTest {

    private static final Map<String, String> KIND_OF_GROUP = Map.ofEntries(
            Map.entry("tower", "building"), Map.entry("riverside", "building"), Map.entry("compound", "building"),
            Map.entry("classic", "building"), Map.entry("lobby", "building"), Map.entry("city", "building"),
            Map.entry("living", "apartment"), Map.entry("bedroom", "apartment"), Map.entry("kitchen", "apartment"),
            Map.entry("penthouse", "apartment"), Map.entry("villa", "apartment"), Map.entry("shophouse", "apartment"),
            Map.entry("pool", "amenity"), Map.entry("gym", "amenity"), Map.entry("bbq", "amenity"),
            Map.entry("lounge", "amenity"), Map.entry("cleaning", "service"), Map.entry("sofa", "service"),
            Map.entry("repair", "service"), Map.entry("laundry", "service"), Map.entry("concierge", "service"),
            Map.entry("male", "resident"), Map.entry("female", "resident"));

    @Test
    void picksImagesByTypeAndKeyword() {
        assertThat(DemoImageSeeder.buildingImages(Map.of("TYPE", "COMPOUND", "ROW_NO", 0)))
                .containsExactly("compound-1", "lobby-1");
        assertThat(DemoImageSeeder.buildingImages(Map.of("TYPE", "BUILDING", "ROW_NO", 1)).getFirst()).isEqualTo("tower-1");
        assertThat(DemoImageSeeder.apartmentImages(Map.of("TYPE", "VILLA", "ROW_NO", 7)).getFirst()).isEqualTo("villa-2");
        assertThat(DemoImageSeeder.apartmentImages(Map.of("TYPE", "APARTMENT", "ROW_NO", 6)))
                .containsExactly("living-2", "bedroom-3", "kitchen-1");
        assertThat(DemoImageSeeder.amenityImage("sky-pool hồ bơi")).isEqualTo("pool");
        assertThat(DemoImageSeeder.amenityImage("sky-bbq khu bbq")).isEqualTo("bbq");
        assertThat(DemoImageSeeder.amenityImage("phòng sinh hoạt cộng đồng")).isEqualTo("lounge");
        assertThat(DemoImageSeeder.serviceImage("giặt sofa vệ sinh")).isEqualTo("sofa");
        assertThat(DemoImageSeeder.serviceImage("sửa điện nước sửa chữa")).isEqualTo("repair");
        assertThat(DemoImageSeeder.serviceImage("giặt sấy quần áo giặt là")).isEqualTo("laundry");
        assertThat(DemoImageSeeder.variant("female", 5)).isEqualTo("female-2");
    }

    /** Số biến thể khai báo ở VARIANTS phải khớp đúng số tệp trong demo-images/. */
    @Test
    void variantCountsMatchClasspathFiles() {
        KIND_OF_GROUP.forEach((group, kind) -> {
            int files = 0;
            while (exists(kind, group + "-" + (files + 1))) {
                files++;
            }
            assertThat(files).as(group).isPositive();
            for (int n = 0; n < files * 2; n++) {
                assertThat(exists(kind, DemoImageSeeder.variant(group, n))).as(group + " #" + n).isTrue();
            }
            assertThat(DemoImageSeeder.variant(group, files - 1)).as(group + " dùng hết ảnh").isEqualTo(group + "-" + files);
        });
    }

    private static boolean exists(String kind, String name) {
        return new ClassPathResource("demo-images/" + kind + "/" + name + ".jpg").exists();
    }
}
