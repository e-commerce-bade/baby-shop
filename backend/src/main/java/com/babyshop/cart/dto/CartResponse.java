package com.babyshop.cart.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        Long id,
        String sessionId,
        String status,
        List<CartItemResponse> items,
        int totalQuantity,
        BigDecimal subtotal,
        String currency
) {
}
