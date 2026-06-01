package com.babyshop.customer.dto;

import jakarta.validation.constraints.Size;

public record CustomerProfileUpdateRequest(
        @Size(max = 100, message = "First name must be 100 characters or fewer")
        String firstName,
        @Size(max = 100, message = "Last name must be 100 characters or fewer")
        String lastName,
        @Size(max = 30, message = "Phone number must be 30 characters or fewer")
        String phoneNumber
) {
}
