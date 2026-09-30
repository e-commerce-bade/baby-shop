package com.babyshop.product;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class SizeLabelsTest {

    @Test
    void shouldOrderAgeRangesNumerically() {
        List<String> sorted = Stream.of("10-11 Yaş", "3-4 Yaş", "13-14 Yaş", "1-2 Yaş", "9-10 Yaş", "2-3 Yaş")
                .sorted(SizeLabels.ORDER)
                .toList();

        assertThat(sorted).containsExactly("1-2 Yaş", "2-3 Yaş", "3-4 Yaş", "9-10 Yaş", "10-11 Yaş", "13-14 Yaş");
    }

    @Test
    void shouldPlaceSingleAgesBetweenTheirNeighbouringRanges() {
        List<String> sorted = Stream.of("6-7 Yaş", "6 Yaş", "5-6", "10 Yaş", "9-10")
                .sorted(SizeLabels.ORDER)
                .toList();

        assertThat(sorted).containsExactly("5-6", "6 Yaş", "6-7 Yaş", "9-10", "10 Yaş");
    }

    @Test
    void shouldPutMonthSizesFirstAndNonNumericLabelsLast() {
        List<String> sorted = Stream.of("Siyah", "1-2 Yaş", "12-18 Ay", "0-3 Ay", "Mavi", "6-12A")
                .sorted(SizeLabels.ORDER)
                .toList();

        assertThat(sorted).containsExactly("0-3 Ay", "6-12A", "12-18 Ay", "1-2 Yaş", "Mavi", "Siyah");
    }
}
