package com.babyshop.product.dto;

import java.math.BigDecimal;

public record ProductVariantResponse(
        Long id,
        String sku,
        String sizeLabel,
        String colorName,
        int stockQuantity,
        BigDecimal price,
        String currency,
        boolean active
) {
}
