package com.babyshop.payment.gateway;

import com.babyshop.order.Order;
import org.springframework.stereotype.Component;

@Component
public class MockPaymentGateway implements PaymentGateway {

    @Override
    public String providerCode() {
        return "MOCK";
    }

    @Override
    public PaymentGatewayInitiation initiatePayment(
            Order order,
            String transactionId,
            String successUrl,
            String cancelUrl
    ) {
        String providerReference = "MOCK-" + transactionId;
        String paymentPageUrl = "https://mock-payments.local/checkout/"
                + transactionId
                + "?successUrl=" + encode(successUrl)
                + "&cancelUrl=" + encode(cancelUrl)
                + "&orderNumber=" + order.getOrderNumber();

        return new PaymentGatewayInitiation(providerReference, paymentPageUrl);
    }

    private String encode(String value) {
        return value == null ? "" : value.replace(" ", "%20");
    }
}
