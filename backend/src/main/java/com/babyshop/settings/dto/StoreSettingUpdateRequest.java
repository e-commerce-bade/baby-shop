package com.babyshop.settings.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record StoreSettingUpdateRequest(
        @NotNull(message = "Ücretsiz kargo eşiği zorunlu.")
        @DecimalMin(value = "0.0", message = "Ücretsiz kargo eşiği negatif olamaz.")
        @Digits(integer = 10, fraction = 2, message = "Ücretsiz kargo eşiği en fazla 2 ondalık olabilir.")
        BigDecimal freeShippingThreshold,

        @NotNull(message = "Kargo ücreti zorunlu.")
        @DecimalMin(value = "0.0", message = "Kargo ücreti negatif olamaz.")
        @Digits(integer = 10, fraction = 2, message = "Kargo ücreti en fazla 2 ondalık olabilir.")
        BigDecimal shippingFee,

        @NotNull(message = "Minimum sepet tutarı zorunlu.")
        @DecimalMin(value = "0.0", message = "Minimum sepet tutarı negatif olamaz.")
        @Digits(integer = 10, fraction = 2, message = "Minimum sepet tutarı en fazla 2 ondalık olabilir.")
        BigDecimal minimumOrderAmount,

        boolean cardEnabled,

        boolean codEnabled,

        @NotNull(message = "Kapıda ödeme farkı zorunlu.")
        @DecimalMin(value = "0.0", message = "Kapıda ödeme farkı negatif olamaz.")
        @Digits(integer = 10, fraction = 2, message = "Kapıda ödeme farkı en fazla 2 ondalık olabilir.")
        BigDecimal codSurcharge,

        boolean bankTransferEnabled,

        @Size(max = 40, message = "IBAN en fazla 40 karakter olabilir.")
        String bankTransferIban,

        @Size(max = 150, message = "Hesap adı en fazla 150 karakter olabilir.")
        String bankTransferAccountName,

        @Size(max = 100, message = "Banka adı en fazla 100 karakter olabilir.")
        String bankTransferBankName,

        @Size(max = 500, message = "Kargo firmaları listesi en fazla 500 karakter olabilir.")
        String shippingCarriers
) {
}
