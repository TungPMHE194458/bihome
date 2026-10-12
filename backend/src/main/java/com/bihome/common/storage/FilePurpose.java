package com.bihome.common.storage;

import lombok.Getter;

@Getter
public enum FilePurpose {
    BUILDING_IMAGE(true),
    APARTMENT_IMAGE(true),
    AVATAR(true),
    RESIDENT_AVATAR(true),
    AMENITY_IMAGE(true),
    SERVICE_IMAGE(true),
    METER_IMAGE(true),
    DOCUMENT(false),
    TICKET_ATTACHMENT(false),
    ANNOUNCEMENT_ATTACHMENT(false);

    private static final long IMAGE_MAX_BYTES = 5L * 1024 * 1024;
    private static final long DOCUMENT_MAX_BYTES = 20L * 1024 * 1024;

    private final boolean imageOnly;

    FilePurpose(boolean imageOnly) {
        this.imageOnly = imageOnly;
    }

    public long maxBytes() {
        return imageOnly ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
    }

    public boolean allows(DetectedFileType type) {
        return imageOnly ? type.isImage() : type != DetectedFileType.WEBP;
    }
}
