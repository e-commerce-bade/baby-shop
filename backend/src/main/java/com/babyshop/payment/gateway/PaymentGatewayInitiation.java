package com.babyshop.payment.gateway;

public record PaymentGatewayInitiation(
        String providerReference,
        String paymentPageUrl
) {
}
