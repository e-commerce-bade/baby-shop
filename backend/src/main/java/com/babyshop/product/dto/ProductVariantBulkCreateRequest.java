package com.babyshop.product.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Mevcut bir urune ayni anda birden fazla beden/renk ekler; hepsi tek transaction'da olusur (biri
 * gecersizse hicbiri eklenmez). SKU sunucuda uretilir, para birimi urunun diger varyantlarindan alinir.
 */
public record ProductVariantBulkCreateRequest(
        @NotEmpty(message = "En az bir varyant gönderilmelidir")
        @Size(max = 500, message = "Tek seferde en fazla 500 varyant eklenebilir")
        List<@Valid @NotNull Item> variants
) {

    public record Item(
            @NotBlank(message = "Beden/yaş zorunludur")
            @Size(max = 80, message = "Beden/yaş en fazla 80 karakter olabilir")
            String sizeLabel,
            @NotBlank(message = "Renk zorunludur")
            @Size(max = 80, message = "Renk en fazla 80 karakter olabilir")
            String colorName,
            @NotNull(message = "Stok zorunludur")
            @Min(value = 0, message = "Stok sıfır veya daha büyük olmalıdır")
            Integer stockQuantity,
            @NotNull(message = "Fiyat zorunludur")
            @DecimalMin(value = "0.00", inclusive = true, message = "Fiyat sıfır veya daha büyük olmalıdır")
            @Digits(integer = 10, fraction = 2, message = "Fiyat en fazla 10 basamak ve 2 ondalık basamak olabilir")
            BigDecimal price,
            @DecimalMin(value = "0.00", inclusive = true, message = "İndirimsiz fiyat sıfır veya daha büyük olmalıdır")
            @Digits(integer = 10, fraction = 2, message = "İndirimsiz fiyat en fazla 10 basamak ve 2 ondalık basamak olabilir")
            BigDecimal compareAtPrice
    ) {
    }
}
