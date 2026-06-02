package com.babyshop.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 150, message = "Email must be 150 characters or fewer")
        String email,
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 255, message = "Password must be between 8 and 255 characters")
        String password,
        @Size(max = 100, message = "First name must be 100 characters or fewer")
        String firstName,
        @Size(max = 100, message = "Last name must be 100 characters or fewer")
        String lastName,
        @Size(max = 30, message = "Phone number must be 30 characters or fewer")
        String phoneNumber
) {
}
