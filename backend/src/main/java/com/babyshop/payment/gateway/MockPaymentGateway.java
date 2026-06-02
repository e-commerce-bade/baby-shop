package com.babyshop.payment.gateway;

import com.babyshop.order.Order;
import com.babyshop.payment.Payment;
import com.babyshop.payment.PaymentProperties;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.common.exception.InvalidRequestException;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Locale;

@Component
public class MockPaymentGateway implements PaymentGateway {

    private final PaymentProperties paymentProperties;

    public MockPaymentGateway(PaymentProperties paymentProperties) {
        this.paymentProperties = paymentProperties;
    }

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

    @Override
    public void verifyCallback(PaymentCallbackRequest request, Payment payment) {
        String signature = normalizeRequired(request.signature(), "Payment callback signature is required for provider MOCK");
        String expectedSignature = generateSignature(
                payment.getTransactionId(),
                payment.getProviderReference(),
                request.status()
        );

        if (!expectedSignature.equals(signature)) {
            throw new InvalidRequestException("Invalid payment callback signature for provider MOCK");
        }
    }

    public String generateSignature(String transactionId, String providerReference, String status) {
        try {
            String secret = callbackSecret();
            String payload = String.join("|",
                    normalizePart(transactionId),
                    normalizePart(providerReference),
                    normalizePart(status).toUpperCase(Locale.ROOT)
            );

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signatureBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(signatureBytes);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to generate mock payment callback signature", exception);
        }
    }

    private String encode(String value) {
        return value == null ? "" : value.replace(" ", "%20");
    }

    private String callbackSecret() {
        String secret = paymentProperties.mock() == null ? null : paymentProperties.mock().callbackSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Mock payment callback secret must be configured");
        }
        return secret;
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new InvalidRequestException(message);
        }
        return value.trim();
    }

    private String normalizePart(String value) {
        return value == null ? "" : value.trim();
    }
}
