package com.babyshop.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
        Mock mock
) {
    public record Mock(
            String callbackSecret
    ) {
    }
}
