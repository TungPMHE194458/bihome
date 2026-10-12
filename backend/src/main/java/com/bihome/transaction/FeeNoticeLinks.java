package com.bihome.transaction;

/**
 * Khoản phí chưa thanh toán đã nằm trong thông báo phí (cài đặt ở module thông báo phí, tránh phụ thuộc vòng).
 */
public interface FeeNoticeLinks {

    String noticeCode(Long feeNoticeId);

    /**
     * Gỡ khoản phí khỏi thông báo phí trước khi huỷ khoản: thông báo còn nháp thì bỏ dòng và tính lại tổng; đã phát
     * hành thì không cho huỷ (ném lỗi).
     */
    void release(FinancialTransaction transaction);
}
