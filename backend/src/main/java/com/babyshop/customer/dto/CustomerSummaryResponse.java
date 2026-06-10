package com.babyshop.customer.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Admin-facing summary of a registered shop customer, enriched with order
 * aggregates (how many orders they placed and how much they have spent).
 */
public record CustomerSummaryResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        boolean active,
        long orderCount,
        BigDecimal totalSpent,
        String currency,
        OffsetDateTime createdAt,
        OffsetDateTime lastOrderAt
) {
}
