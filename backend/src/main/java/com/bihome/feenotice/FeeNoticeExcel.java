package com.bihome.feenotice;

import com.bihome.common.excel.ExcelWriter;
import com.bihome.common.util.BillingPeriods;
import com.bihome.feenotice.FeeNotice.ItemType;
import com.bihome.feenotice.FeeNotice.Status;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Sheet;

/** Xuất danh sách thông báo phí (sheet tổng hợp + sheet chi tiết từng khoản). */
final class FeeNoticeExcel {

    static final Map<Status, String> STATUS_LABELS = new EnumMap<>(Map.of(
            Status.DRAFT, "Nháp", Status.ISSUED, "Đã phát hành", Status.PARTIAL, "Thanh toán một phần",
            Status.PAID, "Đã thanh toán", Status.OVERDUE, "Quá hạn", Status.CANCELLED, "Huỷ"));
    static final Map<ItemType, String> ITEM_LABELS = new EnumMap<>(Map.of(
            ItemType.MANAGEMENT, "Phí quản lý", ItemType.ELECTRIC, "Điện", ItemType.WATER, "Nước",
            ItemType.PARKING, "Gửi xe", ItemType.OTHER, "Phí khác", ItemType.VAT, "VAT",
            ItemType.SERVICE, "Tiện ích / dịch vụ", ItemType.PREVIOUS_DEBT, "Nợ kỳ trước", ItemType.DISCOUNT, "Giảm trừ"));

    private FeeNoticeExcel() {
    }

    static byte[] export(List<FeeNotice> rows, Map<Long, String> carriedCodes) {
        try (ExcelWriter excel = new ExcelWriter()) {
            Sheet sheet = excel.sheet("Thông báo phí", List.of("Mã thông báo", "Kỳ", "Tòa nhà", "Căn hộ", "Chủ hộ",
                    "Tổng cộng", "Đã thanh toán", "Còn nợ", "Hạn thanh toán", "Trạng thái", "Chuyển nợ sang",
                    "Phát hành lúc", "Ghi chú"));
            Sheet detail = excel.sheet("Chi tiết khoản", List.of("Mã thông báo", "Căn hộ", "Nhóm", "Nội dung",
                    "Số lượng", "Đơn giá", "Thành tiền", "Tham chiếu"));
            for (FeeNotice n : rows) {
                excel.row(sheet, Arrays.asList(n.getCode(), BillingPeriods.label(n.getBillingPeriod()),
                        n.getBuilding().getName(), n.getApartment().getCode(), n.getHolderName(), n.getTotalAmount(),
                        n.getPaidAmount(), n.outstanding(), n.getDueDate(), STATUS_LABELS.get(n.getStatus()),
                        n.getCarriedToId() == null ? null : carriedCodes.get(n.getCarriedToId()), n.getIssuedAt(),
                        n.getNote()));
                for (FeeNotice.Item i : n.getItems()) {
                    excel.row(detail, Arrays.asList(n.getCode(), n.getApartment().getCode(), ITEM_LABELS.get(i.getType()),
                            i.getDescription(), i.getQuantity(), i.getUnitPrice(), i.getAmount(), i.getSourceRef()));
                }
            }
            return excel.toBytes();
        }
    }
}
