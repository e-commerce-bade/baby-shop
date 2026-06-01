package com.babyshop.product.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductVariantStockUpdateRequest(
        @NotNull(message = "Product variant stock quantity is required")
        @Min(value = 0, message = "Product variant stock quantity must be zero or greater")
        Integer stockQuantity
) {
}
