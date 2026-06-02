package com.babyshop.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PaymentInitiationRequest(
        @NotBlank(message = "Order number is required")
        @Size(max = 50, message = "Order number must be at most 50 characters")
        String orderNumber,
        @NotBlank(message = "Payment provider is required")
        @Size(max = 50, message = "Payment provider must be at most 50 characters")
        String provider,
        @NotBlank(message = "Payment success URL is required")
        @Size(max = 500, message = "Payment success URL must be at most 500 characters")
        String successUrl,
        @NotBlank(message = "Payment cancel URL is required")
        @Size(max = 500, message = "Payment cancel URL must be at most 500 characters")
        String cancelUrl
) {
}
