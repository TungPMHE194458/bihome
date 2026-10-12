package com.bihome.asset;

import java.util.Locale;

/** Chuẩn hoá biển số / số hiệu: in hoa, bỏ khoảng trắng thừa ("30a  123.45 " → "30A 123.45"). */
final class PlateNumbers {

    private PlateNumbers() {
    }

    static String normalize(String plate) {
        if (plate == null || plate.isBlank()) {
            return null;
        }
        return plate.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }
}
