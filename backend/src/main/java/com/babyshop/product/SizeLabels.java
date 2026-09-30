package com.babyshop.product;

import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Beden/yas etiketlerini okunakli sirada dizer: once ay bedenleri, sonra yaslar, en sonda sayi
 * icermeyen etiketler; kendi icinde ilk ve ikinci sayiya gore ("3-4" &lt; "10-11", "5-6" &lt; "6" &lt; "6-7").
 * Duz metin siralamasi "10-11"i "3-4"ten once getirdigi icin kullanilir.
 */
public final class SizeLabels {

    private static final Pattern NUMBER = Pattern.compile("\\d+");
    private static final Pattern MONTHS = Pattern.compile("\\d\\s*(ay|a|m|mo|months?)\\s*$", Pattern.CASE_INSENSITIVE);

    public static final Comparator<String> ORDER = Comparator
            .<String>comparingInt(label -> sortKey(label)[0])
            .thenComparingInt(label -> sortKey(label)[1])
            .thenComparingInt(label -> sortKey(label)[2])
            .thenComparing(Comparator.naturalOrder());

    private SizeLabels() {
    }

    private static int[] sortKey(String label) {
        Matcher numbers = NUMBER.matcher(label);
        if (!numbers.find()) {
            return new int[]{2, 0, 0};
        }

        int first = parse(numbers.group());
        int second = numbers.find() ? parse(numbers.group()) : first;
        return new int[]{MONTHS.matcher(label.trim()).find() ? 0 : 1, first, second};
    }

    private static int parse(String digits) {
        // Cok uzun rakam dizilerinde tasmayi onlemek icin sinirla.
        return digits.length() > 6 ? Integer.MAX_VALUE : Integer.parseInt(digits);
    }
}
