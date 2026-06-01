package com.babyshop.auth.dto;

import java.time.Instant;

public record AuthTokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        Instant expiresAt,
        String email,
        String role
) {
}
