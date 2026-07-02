package com.babyshop.order.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Misafir siparis takibi (numara + e-posta) icin yalin yanit. Kimlik dogrulanmamis bir uc
 * oldugundan yalnizca takip ekraninin gosterdigi alanlar doner; e-posta, telefon, siparis notu
 * ve odeme referanslari (transactionId/providerReference) gibi PII paylasilmaz.
 */
public record GuestOrderResponse(
        String orderNumber,
        String status,
        String customerFirstName,
        String customerLastName,
        BigDecimal subtotalAmount,
        BigDecimal shippingAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String currency,
        OffsetDateTime createdAt,
        OrderAddressResponse shippingAddress,
        String notes,
        List<OrderItemResponse> items
) {
}
