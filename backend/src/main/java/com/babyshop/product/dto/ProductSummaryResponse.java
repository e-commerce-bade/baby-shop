package com.babyshop.product.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductSummaryResponse(
        Long id,
        String name,
        String slug,
        String description,
        String brand,
        boolean active,
        String categoryName,
        String categorySlug,
        BigDecimal minPrice,
        String currency,
        String primaryImageUrl,
        List<ProductVariantResponse> variants
) {
}
