package com.babyshop.auth.dto;

import java.time.OffsetDateTime;
import java.util.Set;

public record AdminUserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        boolean active,
        Set<String> roles,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
