package com.babyshop.common.search;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;

import java.util.Locale;

/**
 * Arama karsilastirmalari icin metni sadelestirir: buyuk/kucuk harf ve Turkce karakter farki
 * yok sayilir ("KIZ", "kız" ve "kiz" ayni anahtara iner; "PİJAMA" = "pijama").
 * <p>
 * Ayni donusum hem sorgu metnine (Java) hem kolona (SQL {@code translate} + {@code lower})
 * uygulanir; boylece sonuc veritabaninin yerel ayarindan bagimsizdir.
 */
public final class SearchText {

    /** {@code translate()} icin kaynak ve hedef karakterler (ayni sirada). */
    public static final String FROM = "İIıŞşĞğÜüÖöÇç";
    public static final String TO = "iiissgguuoocc";

    /**
     * LIKE kaliplarindaki kacis karakteri. Ters bolu degil: HQL'de ESCAPE yazilmayan bir LIKE
     * PostgreSQL'e {@code escape ''} olarak gider ve ters bolu siradan bir karaktere donusur; bu
     * yuzden hem Criteria hem HQL sorgulari bu karakteri acikca belirtir ({@code escape '!'}).
     */
    public static final char LIKE_ESCAPE = '!';

    private SearchText() {
    }

    public static String fold(String value) {
        StringBuilder folded = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            int mapped = FROM.indexOf(current);
            folded.append(mapped >= 0 ? TO.charAt(mapped) : current);
        }
        return folded.toString().toLowerCase(Locale.ROOT);
    }

    public static Expression<String> fold(CriteriaBuilder cb, Expression<String> expression) {
        return cb.lower(cb.function("translate", String.class, expression, cb.literal(FROM), cb.literal(TO)));
    }

    /**
     * Sadelestirilmis metni icinde gecen ("%...%") LIKE kalibina cevirir; joker karakterler
     * ({@code %}, {@code _}) {@link #LIKE_ESCAPE} ile kacirilir. Kalip, ayni kacis karakteri
     * belirtilerek kullanilmalidir.
     */
    public static String containsPattern(String query) {
        String escape = String.valueOf(LIKE_ESCAPE);
        String escaped = fold(query.trim())
                .replace(escape, escape + escape)
                .replace("%", escape + "%")
                .replace("_", escape + "_");
        return "%" + escaped + "%";
    }

    public static char likeEscape() {
        return LIKE_ESCAPE;
    }

    /**
     * Metin bir telefon numarasi (ya da parcasi) gibi yazilmissa aranacak rakamlari dondurur; bastaki
     * ulke kodu / sifir atilir ki "0555 000" yazimi "+90 555 000 ..." kaydiyla eslessin.
     * <p>
     * Harf iceren metinlerde (siparis no, e-posta) null doner: aksi halde icindeki rakamlar
     * ("ORD-AB4C8D21" -> "4821") ilgisiz telefonlarla eslesir. Uc rakamdan kisa ise de null doner.
     */
    public static String phoneDigits(String query) {
        String trimmed = query.trim();
        if (!trimmed.matches("[0-9+()\\-.\\s]+")) {
            return null;
        }

        String digits = trimmed.replaceAll("[^0-9]", "");
        String local = digits;
        if (digits.startsWith("90")) {
            local = digits.substring(2);
        } else if (digits.startsWith("0")) {
            local = digits.substring(1);
        }
        if (local.length() >= 3) {
            return local;
        }
        // "9053" gibi henuz tamamlanmamis yazimlarda on ek atilinca cok kisa kalir; oldugu gibi aranir.
        return digits.length() >= 3 ? digits : null;
    }
}
