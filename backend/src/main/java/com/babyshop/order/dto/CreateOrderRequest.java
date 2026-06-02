package com.babyshop.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateOrderRequest(
        @NotBlank(message = "Order session id is required")
        @Size(max = 120, message = "Order session id must be at most 120 characters")
        String sessionId,
        @NotBlank(message = "Customer email is required")
        @Email(message = "Customer email must be valid")
        @Size(max = 150, message = "Customer email must be at most 150 characters")
        String customerEmail,
        @Size(max = 100, message = "Customer first name must be at most 100 characters")
        String customerFirstName,
        @Size(max = 100, message = "Customer last name must be at most 100 characters")
        String customerLastName,
        @Size(max = 30, message = "Customer phone must be at most 30 characters")
        String customerPhone,
        @Positive(message = "Shipping address id must be greater than zero")
        Long shippingAddressId,
        @Valid
        OrderAddressRequest shippingAddress,
        @Size(max = 2000, message = "Order notes must be at most 2000 characters")
        String notes
) {
}
