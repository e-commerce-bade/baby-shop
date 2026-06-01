package com.babyshop.customer.dto;

import java.util.Set;

public record CustomerProfileResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        boolean active,
        Set<String> roles
) {
}
