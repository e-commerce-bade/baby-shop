package com.babyshop.common.search;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SearchTextTest {

    @Test
    void shouldFoldTurkishCaseVariantsToTheSameKey() {
        assertThat(SearchText.fold("KIZ")).isEqualTo("kiz");
        assertThat(SearchText.fold("kız")).isEqualTo("kiz");
        assertThat(SearchText.fold("Kiz")).isEqualTo("kiz");
        assertThat(SearchText.fold("PİJAMA")).isEqualTo(SearchText.fold("pijama"));
        assertThat(SearchText.fold("GARNİLİ KIZ TAKIM")).isEqualTo("garnili kiz takim");
        assertThat(SearchText.fold("Şort Çiçek Gömlek Üst Öğle")).isEqualTo("sort cicek gomlek ust ogle");
    }

    @Test
    void shouldKeepTranslateSourceAndTargetAligned() {
        assertThat(SearchText.FROM).hasSameSizeAs(SearchText.TO);
    }

    @Test
    void shouldBuildContainsPatternAndEscapeLikeWildcards() {
        assertThat(SearchText.containsPattern("  Işık  ")).isEqualTo("%isik%");
        assertThat(SearchText.containsPattern("ayse_yilmaz")).isEqualTo("%ayse!_yilmaz%");
        assertThat(SearchText.containsPattern("100%!x")).isEqualTo("%100!%!!x%");
        // Ters bolu kacis karakteri degildir; oldugu gibi aranir.
        assertThat(SearchText.containsPattern("a\\b")).isEqualTo("%a\\b%");
    }

    @Test
    void shouldReduceTypedPhoneNumbersToComparableDigits() {
        assertThat(SearchText.phoneDigits("0555 000 00 00")).isEqualTo("5550000000");
        assertThat(SearchText.phoneDigits("+90 (555) 000-00-00")).isEqualTo("5550000000");
        assertThat(SearchText.phoneDigits("555 000")).isEqualTo("555000");
        assertThat(SearchText.phoneDigits("9053")).isEqualTo("9053");
        assertThat(SearchText.phoneDigits("12")).isNull();
    }

    @Test
    void shouldNotTreatTextWithLettersAsAPhoneNumber() {
        assertThat(SearchText.phoneDigits("Ayşe")).isNull();
        assertThat(SearchText.phoneDigits("no 12345")).isNull();
        assertThat(SearchText.phoneDigits("ORD-AB4C8D21EF1A")).isNull();
        assertThat(SearchText.phoneDigits("mehmet1990@ornek.test")).isNull();
    }
}
