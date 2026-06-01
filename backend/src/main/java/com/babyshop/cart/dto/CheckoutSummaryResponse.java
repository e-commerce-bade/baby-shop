package com.babyshop.cart.dto;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutSummaryResponse(
        Long cartId,
        String sessionId,
        List<CartItemResponse> items,
        int totalQuantity,
        BigDecimal subtotal,
        BigDecimal shippingAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String currency,
        boolean readyForCheckout
) {
}
