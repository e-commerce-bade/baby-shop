package com.babyshop.payment.gateway;

import com.babyshop.order.Order;
import com.babyshop.payment.Payment;
import com.babyshop.payment.dto.PaymentCallbackRequest;

public interface PaymentGateway {

    String providerCode();

    PaymentGatewayInitiation initiatePayment(
            Order order,
            String transactionId,
            String successUrl,
            String cancelUrl
    );

    void verifyCallback(PaymentCallbackRequest request, Payment payment);
}
