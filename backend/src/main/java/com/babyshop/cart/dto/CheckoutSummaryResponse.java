package com.babyshop.cart.dto;

import com.babyshop.customer.dto.CustomerAddressResponse;

import java.math.BigDecimal;
import java.util.List;

public record CheckoutSummaryResponse(
        Long cartId,
        String sessionId,
        List<CartItemResponse> items,
        int itemCount,
        int totalQuantity,
        BigDecimal subtotal,
        BigDecimal shippingAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String currency,
        BigDecimal freeShippingThreshold,
        BigDecimal remainingAmountForFreeShipping,
        boolean eligibleForFreeShipping,
        BigDecimal minimumOrderAmount,
        boolean readyForCheckout,
        String checkoutBlockedReason,
        CustomerAddressResponse defaultShippingAddress
) {
}
