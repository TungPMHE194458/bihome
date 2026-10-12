package com.bihome.payment;

import static com.bihome.common.pdf.Pdf.bold;
import static com.bihome.common.pdf.Pdf.font;
import static com.bihome.common.pdf.Pdf.plain;

import com.bihome.building.Building;
import com.bihome.common.pdf.Pdf;
import com.bihome.common.pdf.VietnameseNumberWords;
import com.bihome.common.util.AppTime;
import com.bihome.common.util.BillingPeriods;
import com.bihome.setting.SettingService;
import com.lowagie.text.Element;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import java.awt.Color;
import java.time.format.DateTimeFormatter;

/** PDF phiếu thu (phiếu đã huỷ ghi rõ "ĐÃ HUỶ" kèm lý do). */
final class ReceiptPdf {

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private ReceiptPdf() {
    }

    static byte[] render(Payment p, Building b, SettingService.Snapshot org) {
        return Pdf.a4(doc -> {
            doc.add(Pdf.paragraph(b.getName(), bold(13, Pdf.PRIMARY), Element.ALIGN_LEFT));
            doc.add(Pdf.paragraph(b.getAddressDetail() + ", " + b.getWard() + ", " + b.getProvince(), font(9, Pdf.MUTED),
                    Element.ALIGN_LEFT));
            String organization = Pdf.organizationLine(org.companyName(), org.taxCode(), org.hotline(), org.email());
            if (organization != null) {
                doc.add(Pdf.paragraph(organization, font(9, Pdf.MUTED), Element.ALIGN_LEFT));
            }
            Paragraph title = Pdf.paragraph("PHIẾU THU", bold(18), Element.ALIGN_CENTER);
            title.setSpacingBefore(16);
            doc.add(title);
            doc.add(Pdf.paragraph("Số: " + p.getCode() + (p.getStatus() == Payment.Status.CANCELLED ? " — ĐÃ HUỶ" : ""),
                    p.getStatus() == Payment.Status.CANCELLED ? bold(11, Color.RED) : font(10, Pdf.MUTED),
                    Element.ALIGN_CENTER));
            Paragraph spacer = new Paragraph(" ");
            spacer.setSpacingAfter(6);
            doc.add(spacer);

            PdfPTable t = new PdfPTable(new float[] {1.6f, 4f});
            t.setWidthPercentage(100);
            row(t, "Thời gian thu", p.getPaidAt().atZoneSameInstant(AppTime.ZONE).format(DATE_TIME));
            row(t, "Căn hộ", p.getApartment().getCode());
            row(t, "Người nộp", p.getPayerName() == null ? p.getFeeNotice().getHolderName() : p.getPayerName());
            row(t, "Nội dung", "Thanh toán thông báo phí " + p.getFeeNotice().getCode() + " kỳ "
                    + BillingPeriods.label(p.getFeeNotice().getBillingPeriod()));
            t.addCell(plain("Số tiền", font(11, Pdf.MUTED), Element.ALIGN_LEFT));
            t.addCell(plain(Pdf.money(p.getAmount()) + " đ", bold(13), Element.ALIGN_LEFT));
            row(t, "Bằng chữ", VietnameseNumberWords.money(p.getAmount().longValue()));
            row(t, "Phương thức", PaymentService.METHOD_LABELS.get(p.getMethod()));
            if (p.getBankReference() != null) {
                row(t, "Mã giao dịch", p.getBankReference());
            }
            row(t, "Người thu", p.getCollectorName());
            if (p.getNote() != null) {
                row(t, "Ghi chú", p.getNote());
            }
            if (p.getStatus() == Payment.Status.CANCELLED) {
                row(t, "Lý do huỷ", p.getCancelReason());
            }
            doc.add(t);

            PdfPTable sign = new PdfPTable(2);
            sign.setWidthPercentage(100);
            sign.setSpacingBefore(28);
            sign.addCell(plain("Người nộp tiền", bold(10), Element.ALIGN_CENTER));
            sign.addCell(plain("Người thu tiền", bold(10), Element.ALIGN_CENTER));
            sign.addCell(plain("(Ký, ghi rõ họ tên)", font(8, Pdf.MUTED), Element.ALIGN_CENTER));
            sign.addCell(plain("(Ký, ghi rõ họ tên)", font(8, Pdf.MUTED), Element.ALIGN_CENTER));
            doc.add(sign);
            if (org.documentFooter() != null) {
                Paragraph footer = Pdf.paragraph(org.documentFooter(), font(9, Pdf.MUTED), Element.ALIGN_CENTER);
                footer.setSpacingBefore(36);
                doc.add(footer);
            }
        });
    }

    private static void row(PdfPTable t, String label, String value) {
        t.addCell(plain(label, font(11, Pdf.MUTED), Element.ALIGN_LEFT));
        t.addCell(plain(value == null ? "—" : value, font(11), Element.ALIGN_LEFT));
    }
}
