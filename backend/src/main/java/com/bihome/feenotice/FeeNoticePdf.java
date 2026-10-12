package com.bihome.feenotice;

import static com.bihome.common.pdf.Pdf.bold;
import static com.bihome.common.pdf.Pdf.cell;
import static com.bihome.common.pdf.Pdf.font;
import static com.bihome.common.pdf.Pdf.plain;

import com.bihome.building.Building;
import com.bihome.common.pdf.Pdf;
import com.bihome.common.util.BillingPeriods;
import com.bihome.feenotice.dto.FeeNoticeDtos;
import com.bihome.payment.Payment;
import com.bihome.setting.SettingService;
import com.bihome.vietqr.QrImages;
import com.lowagie.text.BadElementException;
import com.lowagie.text.Element;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** PDF thông báo phí: thông tin căn, bảng khoản, tổng / đã thu / còn nợ và mã VietQR cho số còn nợ. */
final class FeeNoticePdf {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private FeeNoticePdf() {
    }

    static byte[] render(FeeNotice n, Building b, FeeNoticeDtos.VietQr qr, String transferContent, List<Payment> paid,
                         SettingService.Snapshot org) {
        return Pdf.a4(doc -> {
            doc.add(Pdf.paragraph(b.getName(), bold(13, Pdf.PRIMARY), Element.ALIGN_LEFT));
            doc.add(Pdf.paragraph(b.getAddressDetail() + ", " + b.getWard() + ", " + b.getProvince()
                    + (b.getHotline() == null ? "" : " · Hotline " + b.getHotline()), font(9, Pdf.MUTED), Element.ALIGN_LEFT));
            String organization = Pdf.organizationLine(org.companyName(), org.taxCode(), org.hotline(), org.email());
            if (organization != null) {
                doc.add(Pdf.paragraph(organization, font(9, Pdf.MUTED), Element.ALIGN_LEFT));
            }
            Paragraph title = Pdf.paragraph("THÔNG BÁO PHÍ THÁNG " + BillingPeriods.label(n.getBillingPeriod()),
                    bold(16), Element.ALIGN_CENTER);
            title.setSpacingBefore(14);
            doc.add(title);
            Paragraph code = Pdf.paragraph("Mã thông báo: " + n.getCode()
                    + (n.getStatus() == FeeNotice.Status.DRAFT ? " (NHÁP)" : n.getStatus() == FeeNotice.Status.CANCELLED
                    ? " (ĐÃ HUỶ)" : ""), font(10, Pdf.MUTED), Element.ALIGN_CENTER);
            code.setSpacingAfter(12);
            doc.add(code);

            PdfPTable info = new PdfPTable(new float[] {1.2f, 2.3f, 1.2f, 2.3f});
            info.setWidthPercentage(100);
            info.addCell(plain("Căn hộ:", font(10, Pdf.MUTED), Element.ALIGN_LEFT));
            info.addCell(plain(n.getApartment().getCode() + " (tầng " + n.getApartment().getFloorNo() + ")", bold(10),
                    Element.ALIGN_LEFT));
            info.addCell(plain("Chủ hộ:", font(10, Pdf.MUTED), Element.ALIGN_LEFT));
            info.addCell(plain(n.getHolderName() == null ? "—" : n.getHolderName(), bold(10), Element.ALIGN_LEFT));
            info.addCell(plain("Kỳ:", font(10, Pdf.MUTED), Element.ALIGN_LEFT));
            info.addCell(plain(BillingPeriods.label(n.getBillingPeriod()), font(10), Element.ALIGN_LEFT));
            info.addCell(plain("Hạn thanh toán:", font(10, Pdf.MUTED), Element.ALIGN_LEFT));
            info.addCell(plain(n.getDueDate().format(DATE), bold(10), Element.ALIGN_LEFT));
            info.setSpacingAfter(10);
            doc.add(info);

            PdfPTable items = new PdfPTable(new float[] {0.7f, 4.6f, 1.1f, 1.4f, 1.6f});
            items.setWidthPercentage(100);
            items.setHeaderRows(1);
            for (String h : List.of("STT", "Khoản", "Số lượng", "Đơn giá", "Thành tiền")) {
                PdfPCell c = cell(h, bold(9), h.equals("Khoản") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
                c.setBackgroundColor(Pdf.HEADER_BG);
                items.addCell(c);
            }
            int i = 1;
            for (FeeNotice.Item item : n.getItems()) {
                items.addCell(cell(String.valueOf(i++), font(9), Element.ALIGN_RIGHT));
                items.addCell(cell(printable(item.getDescription()), font(9), Element.ALIGN_LEFT));
                items.addCell(cell(item.getQuantity() == null ? "" : Pdf.number(item.getQuantity()), font(9), Element.ALIGN_RIGHT));
                items.addCell(cell(item.getUnitPrice() == null ? "" : Pdf.number(item.getUnitPrice()), font(9),
                        Element.ALIGN_RIGHT));
                items.addCell(cell(Pdf.money(item.getAmount()), font(9), Element.ALIGN_RIGHT));
            }
            total(items, "Tổng cộng", n.getTotalAmount(), true);
            total(items, "Đã thanh toán", n.getPaidAmount(), false);
            total(items, n.getCarriedToId() != null ? "Còn nợ (đã chuyển sang kỳ sau)" : "Còn phải thanh toán",
                    n.getCarriedToId() != null ? n.getTotalAmount().subtract(n.getPaidAmount()).max(BigDecimal.ZERO)
                            : n.outstanding(), true);
            items.setSpacingAfter(12);
            doc.add(items);

            if (!paid.isEmpty()) {
                StringBuilder sb = new StringBuilder("Đã thu: ");
                for (int k = 0; k < paid.size(); k++) {
                    Payment p = paid.get(k);
                    sb.append(k == 0 ? "" : "; ").append(p.getCode()).append(" – ").append(Pdf.money(p.getAmount()))
                            .append(" đ ngày ").append(p.getPaidAt().format(DATE));
                }
                doc.add(Pdf.paragraph(sb.toString(), font(9, Pdf.MUTED), Element.ALIGN_LEFT));
            }

            if (qr != null) {
                PdfPTable box = new PdfPTable(new float[] {1.3f, 3f});
                box.setWidthPercentage(100);
                box.setSpacingBefore(12);
                PdfPCell image = new PdfPCell(qrImage(qr.payload()), true);
                image.setBorder(Rectangle.NO_BORDER);
                image.setPadding(4);
                box.addCell(image);
                PdfPTable text = new PdfPTable(1);
                text.addCell(plain("Quét mã VietQR để thanh toán", bold(11, Pdf.PRIMARY), Element.ALIGN_LEFT));
                text.addCell(plain("Ngân hàng (BIN): " + qr.bankBin(), font(10), Element.ALIGN_LEFT));
                text.addCell(plain("Số tài khoản: " + qr.accountNo(), font(10), Element.ALIGN_LEFT));
                text.addCell(plain("Chủ tài khoản: " + qr.accountName(), font(10), Element.ALIGN_LEFT));
                text.addCell(plain("Số tiền: " + Pdf.money(qr.amount()) + " đ", bold(10), Element.ALIGN_LEFT));
                text.addCell(plain("Nội dung: " + qr.content(), bold(10), Element.ALIGN_LEFT));
                text.addCell(plain("Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự đối soát.",
                        font(8, Pdf.MUTED), Element.ALIGN_LEFT));
                PdfPCell right = new PdfPCell(text);
                right.setBorder(Rectangle.NO_BORDER);
                right.setVerticalAlignment(Element.ALIGN_MIDDLE);
                box.addCell(right);
                doc.add(box);
            } else if (transferContent != null && n.outstanding().signum() > 0) {
                doc.add(Pdf.paragraph("Nội dung chuyển khoản: " + transferContent, font(10), Element.ALIGN_LEFT));
            }
            if (n.getNote() != null) {
                Paragraph note = Pdf.paragraph("Ghi chú: " + n.getNote(), font(9), Element.ALIGN_LEFT);
                note.setSpacingBefore(8);
                doc.add(note);
            }
            Paragraph footer = Pdf.paragraph(org.documentFooter() != null ? org.documentFooter()
                    : "Ban quản lý " + b.getName() + " trân trọng cảm ơn Quý cư dân.",
                    font(9, Pdf.MUTED), Element.ALIGN_CENTER);
            footer.setSpacingBefore(18);
            doc.add(footer);
        });
    }

    /** Font nhúng không có mũi tên "→" (dùng trong mô tả chỉ số cũ → mới): thay bằng gạch ngang. */
    static String printable(String text) {
        return text.replace("→", "–");
    }

    private static void total(PdfPTable table, String label, BigDecimal amount, boolean strong) {
        PdfPCell l = cell(label, strong ? bold(10) : font(10), Element.ALIGN_RIGHT);
        l.setColspan(4);
        table.addCell(l);
        table.addCell(cell(Pdf.money(amount) + " đ", strong ? bold(10) : font(10), Element.ALIGN_RIGHT));
    }

    private static Image qrImage(String payload) {
        try {
            return Image.getInstance(QrImages.png(payload, 360));
        } catch (BadElementException e) {
            throw new IllegalStateException(e);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
