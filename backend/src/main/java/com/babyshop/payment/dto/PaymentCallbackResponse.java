package com.babyshop.payment.dto;

public record PaymentCallbackResponse(
        String provider,
        String transactionId,
        String paymentStatus,
        String orderNumber,
        String orderStatus,
        boolean duplicate
) {
}
