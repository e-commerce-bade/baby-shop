package com.babyshop.customer.dto;

import java.time.OffsetDateTime;

public record CustomerAddressResponse(
        Long id,
        String label,
        String recipientFirstName,
        String recipientLastName,
        String phoneNumber,
        String line1,
        String line2,
        String district,
        String city,
        String postalCode,
        String country,
        boolean defaultAddress,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
