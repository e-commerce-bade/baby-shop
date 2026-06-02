package com.babyshop.order.dto;

public record OrderAddressResponse(
        String line1,
        String line2,
        String district,
        String city,
        String postalCode,
        String country
) {
}
