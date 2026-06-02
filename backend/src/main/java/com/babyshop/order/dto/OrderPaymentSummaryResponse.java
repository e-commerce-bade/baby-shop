package com.babyshop.order.dto;

import java.time.OffsetDateTime;

public record OrderPaymentSummaryResponse(
        String provider,
        String status,
        String transactionId,
        String providerReference,
        OffsetDateTime paidAt
) {
}
