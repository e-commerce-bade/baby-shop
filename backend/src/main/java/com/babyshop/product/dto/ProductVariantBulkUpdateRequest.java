package com.babyshop.product.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Birden fazla varyanti tek istekte (ve tek transaction'da) gunceller. Kalemlerde yalnizca
 * gonderilen alanlar degisir; null birakilan alan oldugu gibi kalir.
 */
public record ProductVariantBulkUpdateRequest(
        @NotEmpty(message = "En az bir varyant gönderilmelidir")
        @Size(max = 2000, message = "Tek seferde en fazla 2000 varyant güncellenebilir")
        List<@Valid @NotNull Item> variants
) {

    public record Item(
            @NotNull(message = "Varyant kimliği zorunludur")
            Long id,
            @Size(max = 80, message = "Beden/yaş en fazla 80 karakter olabilir")
            String sizeLabel,
            @Min(value = 0, message = "Stok sıfır veya daha büyük olmalıdır")
            Integer stockQuantity,
            @DecimalMin(value = "0.00", inclusive = true, message = "Fiyat sıfır veya daha büyük olmalıdır")
            // Kolon NUMERIC(12,2): fazla ondalik sessizce yuvarlanir, fazla basamak veritabani hatasi verir.
            @Digits(integer = 10, fraction = 2, message = "Fiyat en fazla 10 basamak ve 2 ondalık basamak olabilir")
            BigDecimal price,
            // Panelin gosterdigi stok. Verilirse stok ancak veritabanindaki deger hala buysa yazilir;
            // arada bir siparis stogu degistirdiyse kayit reddedilir (bkz. StockConflictException).
            @Min(value = 0, message = "Beklenen stok sıfır veya daha büyük olmalıdır")
            Integer expectedStockQuantity
    ) {
        public Item(Long id, String sizeLabel, Integer stockQuantity, BigDecimal price) {
            this(id, sizeLabel, stockQuantity, price, null);
        }
    }
}
