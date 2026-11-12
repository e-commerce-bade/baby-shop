package com.babyshop.product;

import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Beden/yas etiketlerini okunakli sirada dizer: once ay bedenleri, sonra yaslar, sonra harf bedenler
 * (XS, S, M, L, XL, XXL, 3XL, Battal, Oversize), en sonda digerleri; yas/ay kendi icinde ilk ve ikinci
 * sayiya gore ("3-4" &lt; "10-11", "5-6" &lt; "6" &lt; "6-7"). Duz metin siralamasi "10-11"i "3-4"ten,
 * "L"yi "S"den once getirdigi icin kullanilir.
 */
public final class SizeLabels {

    private static final Pattern NUMBER = Pattern.compile("\\d+");
    private static final Pattern MONTHS = Pattern.compile("\\d\\s*(ay|a|m|mo|months?)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern LETTER_NOISE = Pattern.compile("[\\s.\\-]+");

    // Harf bedenlerin kucukten buyuge sirasi; ayni bedenin farkli yazimlari ayni sirayi alir.
    private static final Map<String, Integer> LETTER_ORDER = Map.ofEntries(
            Map.entry("xxs", 0),
            Map.entry("xs", 1),
            Map.entry("s", 2),
            Map.entry("m", 3),
            Map.entry("l", 4),
            Map.entry("xl", 5),
            Map.entry("xxl", 6),
            Map.entry("2xl", 6),
            Map.entry("xxxl", 7),
            Map.entry("3xl", 7),
            Map.entry("xxxxl", 8),
            Map.entry("4xl", 8),
            Map.entry("5xl", 9),
            Map.entry("battal", 10),
            Map.entry("oversize", 11),
            Map.entry("oversized", 11)
    );

    public static final Comparator<String> ORDER = Comparator
            .<String>comparingInt(label -> sortKey(label)[0])
            .thenComparingInt(label -> sortKey(label)[1])
            .thenComparingInt(label -> sortKey(label)[2])
            .thenComparing(Comparator.naturalOrder());

    private SizeLabels() {
    }

    private static int[] sortKey(String label) {
        // "3XL" sayi icerse de yas degil harf bedendir; bu yuzden once harf bedenlere bakilir.
        Integer letter = LETTER_ORDER.get(letterKey(label));
        if (letter != null) {
            return new int[]{2, letter, 0};
        }

        Matcher numbers = NUMBER.matcher(label);
        if (!numbers.find()) {
            return new int[]{3, 0, 0};
        }

        int first = parse(numbers.group());
        int second = numbers.find() ? parse(numbers.group()) : first;
        return new int[]{MONTHS.matcher(label.trim()).find() ? 0 : 1, first, second};
    }

    // "Oversİze", " xl ", "X-L" -> "oversize", "xl", "xl" (Turkce buyuk I/İ guvenli kucuk harf).
    private static String letterKey(String label) {
        String lower = label.trim().replace('İ', 'I').toLowerCase(Locale.ROOT).replace('ı', 'i');
        return LETTER_NOISE.matcher(lower).replaceAll("");
    }

    private static int parse(String digits) {
        // Cok uzun rakam dizilerinde tasmayi onlemek icin sinirla.
        return digits.length() > 6 ? Integer.MAX_VALUE : Integer.parseInt(digits);
    }
}
