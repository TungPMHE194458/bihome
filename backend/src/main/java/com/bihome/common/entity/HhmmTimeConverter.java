package com.bihome.common.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/** Giờ trong ngày lưu dạng chữ HH:mm (Oracle không có kiểu TIME; chuỗi cùng độ dài nên so sánh được trong SQL). */
@Converter
public class HhmmTimeConverter implements AttributeConverter<LocalTime, String> {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    @Override
    public String convertToDatabaseColumn(LocalTime time) {
        return time == null ? null : time.format(HHMM);
    }

    @Override
    public LocalTime convertToEntityAttribute(String value) {
        return value == null ? null : LocalTime.parse(value, HHMM);
    }
}
