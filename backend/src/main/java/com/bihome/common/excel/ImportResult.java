package com.bihome.common.excel;

import java.util.List;

/**
 * Kết quả nhập Excel theo từng dòng.
 * @param imported false khi chọn "Dừng khi có lỗi" và có ít nhất một dòng lỗi → không dòng nào được lưu.
 */
public record ImportResult(int total, int succeeded, int failed, boolean imported, List<Row> rows) {

    public record Row(int rowNumber, String key, boolean success, String message) {
    }

    public static ImportResult of(List<Row> rows, boolean imported) {
        int ok = (int) rows.stream().filter(Row::success).count();
        return new ImportResult(rows.size(), imported ? ok : 0, rows.size() - ok, imported, rows);
    }
}
