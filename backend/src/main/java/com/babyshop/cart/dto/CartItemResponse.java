package com.babyshop.cart.dto;

import java.math.BigDecimal;

public record CartItemResponse(
        Long id,
        Long productId,
        String productName,
        String productSlug,
        String primaryImageUrl,
        Long productVariantId,
        String sku,
        String sizeLabel,
        String colorName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String currency
) {
}
