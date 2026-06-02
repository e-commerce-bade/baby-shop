package com.babyshop.order.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
        OffsetDateTime createdAt,
        OrderAddressResponse shippingAddress,
        OrderPaymentSummaryResponse payment,
        String notes,
        List<OrderItemResponse> items
) {
}
