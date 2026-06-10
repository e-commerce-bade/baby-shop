package com.babyshop.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank(message = "Google kimlik doğrulama jetonu zorunludur")
        String idToken
) {
}
