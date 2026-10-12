package com.bihome.common.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.function.Consumer;

/**
 * Tiện ích tạo PDF (OpenPDF) với font Be Vietnam Pro (SIL OFL, nhúng trong resources/fonts) để hiển thị đủ dấu
 * tiếng Việt.
 */
public final class Pdf {

    public static final Color PRIMARY = new Color(0x1E, 0x9E, 0x55);
    public static final Color MUTED = new Color(0x6B, 0x72, 0x80);
    public static final Color LINE = new Color(0xE5, 0xE7, 0xEB);
    public static final Color HEADER_BG = new Color(0xF3, 0xF6, 0xF4);

    private static final BaseFont REGULAR = load("fonts/BeVietnamPro-Regular.ttf");
    private static final BaseFont BOLD = load("fonts/BeVietnamPro-Bold.ttf");

    private Pdf() {
    }

    public static Font font(float size) {
        return new Font(REGULAR, size);
    }

    public static Font font(float size, Color color) {
        return new Font(REGULAR, size, Font.NORMAL, color);
    }

    public static Font bold(float size) {
        return new Font(BOLD, size);
    }

    public static Font bold(float size, Color color) {
        return new Font(BOLD, size, Font.NORMAL, color);
    }

    /** Tạo tài liệu A4 và trả về nội dung PDF. */
    public static byte[] a4(Consumer<Document> content) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 36, 36);
        PdfWriter.getInstance(doc, out);
        doc.open();
        content.accept(doc);
        doc.close();
        return out.toByteArray();
    }

    public static Paragraph paragraph(String text, Font font, int align) {
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(align);
        return p;
    }

    public static PdfPCell cell(String text, Font font, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text == null ? "" : text, font));
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setPadding(5);
        c.setBorderColor(LINE);
        return c;
    }

    public static PdfPCell plain(String text, Font font, int align) {
        PdfPCell c = cell(text, font, align);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(2);
        return c;
    }

    /** "Đơn vị quản lý: … · MST … · ĐT … · email" (Cấu hình chung); null nếu chưa khai báo tên đơn vị. */
    public static String organizationLine(String company, String taxCode, String hotline, String email) {
        if (company == null || company.isBlank()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("Đơn vị quản lý: ").append(company);
        if (taxCode != null) {
            sb.append(" · MST ").append(taxCode);
        }
        if (hotline != null) {
            sb.append(" · ĐT ").append(hotline);
        }
        if (email != null) {
            sb.append(" · ").append(email);
        }
        return sb.toString();
    }

    /** 1.234.567 (không kèm đơn vị). */
    public static String money(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        return new DecimalFormat("#,##0", symbols).format(v);
    }

    public static String number(BigDecimal v) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        return new DecimalFormat("#,##0.##", symbols).format(v);
    }

    private static BaseFont load(String path) {
        try (InputStream in = Pdf.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) {
                throw new IllegalStateException("Thiếu font " + path);
            }
            return BaseFont.createFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, in.readAllBytes(), null);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
