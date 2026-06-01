package com.babyshop.order.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long productId,
        Long productVariantId,
        String productName,
        String variantLabel,
        String sku,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        String currency
) {
}
