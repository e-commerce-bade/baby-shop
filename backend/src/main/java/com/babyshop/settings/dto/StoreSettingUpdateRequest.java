package com.babyshop.settings.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record StoreSettingUpdateRequest(
        @NotNull(message = "Ücretsiz kargo eşiği zorunlu.")
        @DecimalMin(value = "0.0", message = "Ücretsiz kargo eşiği negatif olamaz.")
        @Digits(integer = 10, fraction = 2, message = "Ücretsiz kargo eşiği en fazla 2 ondalık olabilir.")
        BigDecimal freeShippingThreshold,

        @NotNull(message = "Kargo ücreti zorunlu.")
        @DecimalMin(value = "0.0", message = "Kargo ücreti negatif olamaz.")
        @Digits(integer = 10, fraction = 2, message = "Kargo ücreti en fazla 2 ondalık olabilir.")
        BigDecimal shippingFee
) {
}
