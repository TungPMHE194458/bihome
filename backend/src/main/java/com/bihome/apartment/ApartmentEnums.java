package com.bihome.apartment;

/** Nhãn tiếng Việt ở đây chỉ dùng cho file Excel nhập/xuất (do backend tạo); giao diện dùng nhãn ở FE. */
public final class ApartmentEnums {

    private ApartmentEnums() {
    }

    public interface Labeled {
        String label();
    }

    public enum ApartmentType implements Labeled {
        APARTMENT("Căn hộ"), PENTHOUSE("Penthouse"), VILLA("Villa"), DUPLEX("Duplex"),
        SHOPHOUSE("Shophouse"), PREMISES("Mặt bằng"), OFFICE("Văn phòng");

        private final String label;

        ApartmentType(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }

    /** Hình thức: cho thuê / sở hữu. */
    public enum OwnershipType implements Labeled {
        RENT("Cho thuê"), OWN("Sở hữu");

        private final String label;

        OwnershipType(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }

    /** Tình trạng sử dụng. */
    public enum UsageStatus implements Labeled {
        VACANT("Trống"), OCCUPIED("Đang ở"), RENOVATING("Đang sửa chữa");

        private final String label;

        UsageStatus(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }
}
