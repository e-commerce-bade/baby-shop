package com.babyshop.payment.gateway;

import com.babyshop.order.Order;

public interface PaymentGateway {

    String providerCode();

    PaymentGatewayInitiation initiatePayment(
            Order order,
            String transactionId,
            String successUrl,
            String cancelUrl
    );
}
