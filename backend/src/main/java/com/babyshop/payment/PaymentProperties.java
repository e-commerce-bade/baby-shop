package com.babyshop.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
        Mock mock,
        Iyzico iyzico,
        // Odeme sonrasi yonlendirilebilecek izinli origin'ler (scheme://host[:port]).
        // Bos ise dogrulama atlanir; doluysa basvurulan success/cancel URL bu listede olmali.
        java.util.List<String> allowedRedirectOrigins
) {
    public record Mock(
            String callbackSecret
    ) {
    }

    public record Iyzico(
            String apiKey,
            String secretKey,
            String baseUrl,
            String callbackUrl,
            String locale,
            java.util.List<Integer> enabledInstallments,
            Integer forceThreeDS,
            String defaultBuyerIdentityNumber,
            String defaultBuyerIp
    ) {
    }
}
