package com.bihome.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ."),
    INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "Tham số không hợp lệ."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu."),
    CONFLICT(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc đang được sử dụng ở nơi khác."),
    VERSION_CONFLICT(HttpStatus.CONFLICT, "Dữ liệu đã được người khác cập nhật. Vui lòng tải lại trang."),
    BUSINESS_RULE_VIOLATION(HttpStatus.UNPROCESSABLE_ENTITY, "Thao tác vi phạm quy tắc nghiệp vụ."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không đúng."),
    ACCOUNT_TEMPORARILY_LOCKED(HttpStatus.LOCKED, "Tài khoản đang tạm khoá."),
    ACCOUNT_INACTIVE(HttpStatus.FORBIDDEN, "Tài khoản đã ngừng hoạt động."),
    ACCOUNT_LOCKED(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."),
    INVALID_OTP(HttpStatus.BAD_REQUEST, "Mã OTP không hợp lệ hoặc đã hết hạn."),
    PASSWORD_CHANGE_REQUIRED(HttpStatus.FORBIDDEN, "Bạn cần đổi mật khẩu trước khi tiếp tục."),
    BUILDING_REQUIRED(HttpStatus.BAD_REQUEST, "Vui lòng chọn tòa nhà."),
    BUILDING_ACCESS_DENIED(HttpStatus.FORBIDDEN, "Bạn không có quyền với tòa nhà này."),
    FILE_EMPTY(HttpStatus.BAD_REQUEST, "Tệp tải lên bị trống."),
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Tệp vượt quá dung lượng cho phép."),
    FILE_TYPE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "Định dạng tệp không được hỗ trợ."),
    STORAGE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu hoặc đọc tệp."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");

    private final HttpStatus status;
    private final String defaultMessage;
}
