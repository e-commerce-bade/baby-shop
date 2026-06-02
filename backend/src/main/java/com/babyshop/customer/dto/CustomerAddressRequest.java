package com.babyshop.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CustomerAddressRequest(
        @Size(max = 80, message = "Address label must be 80 characters or fewer")
        String label,
        @NotBlank(message = "Recipient first name is required")
        @Size(max = 100, message = "Recipient first name must be 100 characters or fewer")
        String recipientFirstName,
        @NotBlank(message = "Recipient last name is required")
        @Size(max = 100, message = "Recipient last name must be 100 characters or fewer")
        String recipientLastName,
        @Size(max = 30, message = "Address phone number must be 30 characters or fewer")
        String phoneNumber,
        @NotBlank(message = "Address line 1 is required")
        @Size(max = 255, message = "Address line 1 must be 255 characters or fewer")
        String line1,
        @Size(max = 255, message = "Address line 2 must be 255 characters or fewer")
        String line2,
        @NotBlank(message = "Address district is required")
        @Size(max = 120, message = "Address district must be 120 characters or fewer")
        String district,
        @NotBlank(message = "Address city is required")
        @Size(max = 120, message = "Address city must be 120 characters or fewer")
        String city,
        @Size(max = 20, message = "Address postal code must be 20 characters or fewer")
        String postalCode,
        @NotBlank(message = "Address country is required")
        @Size(max = 100, message = "Address country must be 100 characters or fewer")
        String country,
        @NotNull(message = "Address default flag is required")
        Boolean defaultAddress
) {
}
