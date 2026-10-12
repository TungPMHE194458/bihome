package com.bihome.common.pdf;

/** Đọc số tiền thành chữ (phiếu thu): 1250000 → "Một triệu hai trăm năm mươi nghìn đồng". */
public final class VietnameseNumberWords {

    private static final String[] DIGITS = {"không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"};
    private static final String[] UNITS = {"", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"};

    private VietnameseNumberWords() {
    }

    public static String money(long amount) {
        if (amount == 0) {
            return "Không đồng";
        }
        String words = read(Math.abs(amount));
        String text = (amount < 0 ? "âm " : "") + words + " đồng";
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }

    static String read(long n) {
        int group = 0;
        String result = "";
        while (n > 0) {
            int chunk = (int) (n % 1000);
            n /= 1000;
            if (chunk > 0) {
                String part = triple(chunk, n > 0) + UNITS[group];
                result = part + (result.isEmpty() ? "" : " " + result);
            }
            group++;
        }
        return result.trim().replaceAll("\\s+", " ");
    }

    /** Đọc 3 chữ số; {@code full} = còn nhóm cao hơn nên đọc đủ "không trăm", "linh". */
    static String triple(int n, boolean full) {
        int hundreds = n / 100;
        int tens = (n / 10) % 10;
        int ones = n % 10;
        StringBuilder sb = new StringBuilder();
        if (hundreds > 0 || full) {
            sb.append(DIGITS[hundreds]).append(" trăm");
        }
        if (tens == 0) {
            if (ones > 0) {
                if (sb.length() > 0) {
                    sb.append(" linh");
                }
                sb.append(' ').append(DIGITS[ones]);
            }
        } else {
            sb.append(' ').append(tens == 1 ? "mười" : DIGITS[tens] + " mươi");
            if (ones == 1 && tens > 1) {
                sb.append(" mốt");
            } else if (ones == 5) {
                sb.append(" lăm");
            } else if (ones == 4 && tens > 1) {
                sb.append(" tư");
            } else if (ones > 0) {
                sb.append(' ').append(DIGITS[ones]);
            }
        }
        return sb.toString().trim();
    }
}
