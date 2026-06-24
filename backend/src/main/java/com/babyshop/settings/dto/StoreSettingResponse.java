package com.babyshop.settings.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record StoreSettingResponse(
        BigDecimal freeShippingThreshold,
        BigDecimal shippingFee,
        String currency,
        OffsetDateTime updatedAt
) {
}
