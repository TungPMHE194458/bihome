package com.bihome.feenotice;

import com.bihome.common.exception.BusinessException;
import com.bihome.common.exception.ErrorCode;
import com.bihome.feenotice.FeeNotice.ItemType;
import com.bihome.transaction.FeeNoticeLinks;
import com.bihome.transaction.FinancialTransaction;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Khoản tiện ích / dịch vụ bị huỷ khi đã nằm trong thông báo phí. */
@Component
@RequiredArgsConstructor
class FeeNoticeTransactionLinks implements FeeNoticeLinks {

    private final FeeNoticeRepository notices;

    @Override
    public String noticeCode(Long feeNoticeId) {
        return notices.findById(feeNoticeId).map(FeeNotice::getCode).orElse("#" + feeNoticeId);
    }

    @Override
    public void release(FinancialTransaction t) {
        FeeNotice n = notices.findById(t.getFeeNoticeId()).orElse(null);
        if (n != null && n.getStatus() != FeeNotice.Status.DRAFT && n.getStatus() != FeeNotice.Status.CANCELLED) {
            throw new BusinessException(ErrorCode.CONFLICT, "Khoản phí " + t.getCode() + " đã nằm trong thông báo phí "
                    + n.getCode() + " đã phát hành; huỷ thông báo phí đó trước hoặc ghi giảm trừ ở kỳ sau.");
        }
        if (n != null && n.getStatus() == FeeNotice.Status.DRAFT) {
            List<FeeNotice.Item> items = new ArrayList<>(n.getItems().stream()
                    .filter(i -> !(i.getType() == ItemType.SERVICE && t.getCode().equals(i.getSourceRef()))).toList());
            items = FeeCalculator.withVat(items, n.getVatPercent());
            n.setItems(items);
            n.setTotalAmount(FeeCalculator.total(items).max(BigDecimal.ZERO));
        }
        t.setFeeNoticeId(null);
    }
}
