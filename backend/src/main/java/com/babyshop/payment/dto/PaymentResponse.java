package com.babyshop.payment.dto;

import java.math.BigDecimal;

public record PaymentResponse(
        Long id,
        String orderNumber,
        String provider,
        String status,
        BigDecimal amount,
        String currency,
        String transactionId,
        String providerReference,
        String paymentPageUrl
) {
}
