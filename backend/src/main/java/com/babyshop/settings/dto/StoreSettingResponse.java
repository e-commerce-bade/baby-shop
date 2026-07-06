package com.babyshop.settings.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record StoreSettingResponse(
        BigDecimal freeShippingThreshold,
        BigDecimal shippingFee,
        BigDecimal minimumOrderAmount,
        boolean cardEnabled,
        boolean codEnabled,
        BigDecimal codSurcharge,
        boolean bankTransferEnabled,
        String bankTransferIban,
        String bankTransferAccountName,
        String bankTransferBankName,
        List<String> shippingCarriers,
        String currency,
        OffsetDateTime updatedAt
) {
}
