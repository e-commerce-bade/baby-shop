package com.babyshop.order.dto;

import java.math.BigDecimal;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        String status,
        String customerEmail,
        String customerFirstName,
        String customerLastName,
        String customerPhone,
        BigDecimal subtotalAmount,
        BigDecimal shippingAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String currency,
        OrderAddressResponse shippingAddress,
        String notes,
        List<OrderItemResponse> items
) {
}
