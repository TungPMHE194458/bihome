package com.bihome.common.messaging;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * Nội dung soạn thảo dạng HTML: chỉ giữ thẻ định dạng cơ bản (đậm, nghiêng, gạch chân, danh sách, liên kết, tiêu đề
 * nhỏ); bỏ script, style, thuộc tính sự kiện. Lọc ở backend trước khi lưu nên FE hiển thị trực tiếp được.
 */
public final class RichText {

    private static final Safelist SAFELIST = Safelist.basic()
            .addTags("h3", "h4", "u", "s", "br")
            .addAttributes("a", "target")
            .addEnforcedAttribute("a", "rel", "noopener noreferrer");

    private RichText() {
    }

    public static String sanitize(String html) {
        if (html == null) {
            return "";
        }
        Document.OutputSettings settings = new Document.OutputSettings().prettyPrint(false);
        return Jsoup.clean(html, "", SAFELIST, settings).trim();
    }

    /** Văn bản thuần (cho email / SMS, kiểm tra nội dung trống). */
    public static String text(String html) {
        return html == null ? "" : Jsoup.parse(html).text().trim();
    }
}
