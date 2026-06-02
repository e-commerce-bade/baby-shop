package com.babyshop.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrderAddressRequest(
        @NotBlank(message = "Shipping address line 1 is required")
        @Size(max = 255, message = "Shipping address line 1 must be at most 255 characters")
        String line1,
        @Size(max = 255, message = "Shipping address line 2 must be at most 255 characters")
        String line2,
        @NotBlank(message = "Shipping district is required")
        @Size(max = 120, message = "Shipping district must be at most 120 characters")
        String district,
        @NotBlank(message = "Shipping city is required")
        @Size(max = 120, message = "Shipping city must be at most 120 characters")
        String city,
        @Size(max = 20, message = "Shipping postal code must be at most 20 characters")
        String postalCode,
        @NotBlank(message = "Shipping country is required")
        @Size(max = 100, message = "Shipping country must be at most 100 characters")
        String country
) {
}
