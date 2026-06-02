package com.babyshop.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentCallbackRequest(
        @Size(max = 150, message = "Payment transaction id must be at most 150 characters")
        String transactionId,
        @Size(max = 150, message = "Payment provider reference must be at most 150 characters")
        String providerReference,
        @NotBlank(message = "Payment callback status is required")
        @Size(max = 30, message = "Payment callback status must be at most 30 characters")
        String status,
        @Size(max = 500, message = "Payment callback signature must be at most 500 characters")
        String signature,
        @Size(max = 2000, message = "Payment callback raw payload must be at most 2000 characters")
        String rawPayload
) {
}
