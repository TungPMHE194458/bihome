package com.bihome.common.exception;

import java.util.List;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final List<FieldErrorItem> errors;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, errorCode.getDefaultMessage());
    }

    public BusinessException(ErrorCode errorCode, String message) {
        this(errorCode, message, List.of());
    }

    public BusinessException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.errors = List.of();
    }

    public BusinessException(ErrorCode errorCode, String message, List<FieldErrorItem> errors) {
        super(message);
        this.errorCode = errorCode;
        this.errors = List.copyOf(errors);
    }

    /** Lỗi gắn với một trường cụ thể để FE hiển thị ngay dưới ô nhập. */
    public static BusinessException field(ErrorCode errorCode, String field, String message) {
        return new BusinessException(errorCode, message, List.of(new FieldErrorItem(field, message)));
    }
}
