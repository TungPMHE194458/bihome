package com.bihome.resident;

import com.bihome.apartment.ApartmentEnums.Labeled;

/** Nhãn tiếng Việt chỉ dùng cho file Excel (do backend tạo/đọc); giao diện dùng nhãn ở FE. */
public final class ResidentEnums {

    private ResidentEnums() {
    }

    public enum IdDocumentType implements Labeled {
        CCCD("CCCD"), PASSPORT("Hộ chiếu");

        private final String label;

        IdDocumentType(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }

    /** Vai trò tại căn hộ. */
    public enum ResidentRole implements Labeled {
        OWNER("Chủ sở hữu"), TENANT("Người thuê"), FAMILY("Thành viên gia đình"), GUEST("Khách lưu trú");

        private final String label;

        ResidentRole(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }

    /** Quan hệ với chủ hộ. */
    public enum Relationship implements Labeled {
        SPOUSE("Vợ/Chồng"), CHILD("Con"), PARENT("Bố/Mẹ"), OTHER("Khác");

        private final String label;

        Relationship(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }

    /** Tình trạng cư trú. */
    public enum ResidenceStatus implements Labeled {
        LIVING("Đang ở"), TEMP_ABSENT("Tạm vắng"), MOVED_OUT("Đã chuyển đi");

        private final String label;

        ResidenceStatus(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }

    /** Tài khoản app cư dân. */
    public enum AppAccountStatus implements Labeled {
        NONE("Chưa tạo"), ACTIVE("Đã kích hoạt"), LOCKED("Bị khoá");

        private final String label;

        AppAccountStatus(String label) {
            this.label = label;
        }

        @Override
        public String label() {
            return label;
        }
    }
}
