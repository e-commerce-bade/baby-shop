package com.babyshop.cart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartItemRequest(
        @NotNull(message = "Product variant id is required")
        Long productVariantId,
        @NotNull(message = "Cart item quantity is required")
        @Min(value = 1, message = "Cart item quantity must be at least 1")
        Integer quantity
) {
}
