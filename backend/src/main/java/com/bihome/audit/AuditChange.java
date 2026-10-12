package com.bihome.audit;

/** Một trường thay đổi; giá trị đã chuyển sang chuỗi (null = trống). */
public record AuditChange(String field, String oldValue, String newValue) {
}
