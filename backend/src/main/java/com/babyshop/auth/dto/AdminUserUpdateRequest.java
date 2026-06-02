package com.babyshop.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record AdminUserUpdateRequest(
        @NotBlank(message = "User email is required")
        @Email(message = "User email must be a valid email address")
        @Size(max = 150, message = "User email must be 150 characters or fewer")
        String email,
        @Size(min = 8, max = 255, message = "User password must be between 8 and 255 characters")
        String password,
        @Size(max = 100, message = "User first name must be 100 characters or fewer")
        String firstName,
        @Size(max = 100, message = "User last name must be 100 characters or fewer")
        String lastName,
        @Size(max = 30, message = "User phone number must be 30 characters or fewer")
        String phoneNumber,
        @NotNull(message = "User active flag is required")
        Boolean active,
        @NotEmpty(message = "At least one role is required")
        Set<@NotBlank(message = "Role name cannot be blank") String> roles
) {
}
