package com.bihome.audit;

public enum AuditAction {
    CREATE,
    UPDATE,
    /** Cập nhật có đổi trường {@code status}. */
    STATUS_CHANGE,
    DELETE
}
