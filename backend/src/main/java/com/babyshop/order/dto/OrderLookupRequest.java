package com.babyshop.order.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Misafir siparis takibi: siparis numarasi + sipariste girilen e-posta birlikte dogrulanir.
public record OrderLookupRequest(
        @NotBlank(message = "Order number is required")
        @Size(max = 40, message = "Order number must be 40 characters or fewer")
        String orderNumber,
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 150, message = "Email must be 150 characters or fewer")
        String email
) {
}
