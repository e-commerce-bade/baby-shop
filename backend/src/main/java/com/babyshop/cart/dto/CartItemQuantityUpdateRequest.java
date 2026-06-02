package com.babyshop.cart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartItemQuantityUpdateRequest(
        @NotNull(message = "Cart item quantity is required")
        @Min(value = 1, message = "Cart item quantity must be at least 1")
        Integer quantity
) {
}
