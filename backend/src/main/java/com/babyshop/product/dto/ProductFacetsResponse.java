package com.babyshop.product.dto;

import java.util.List;

/**
 * Storefront filtre kenar cubugu icin gercek kataloqdan turetilen filtre secenekleri.
 * Sabit listeler yerine bunlar kullanilir; boylece filtreler her zaman mevcut
 * kategoriler/urun tipleri/renkler/bedenlerle eslesir ve "bos sonuc" vermez.
 */
public record ProductFacetsResponse(
        List<CategoryFacet> categories,
        List<String> productTypes,
        List<String> colors,
        List<String> sizes
) {
    public record CategoryFacet(String slug, String name) {
    }
}
