package com.babyshop.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductVariantAdminRequest(
        @Size(max = 100, message = "Product variant SKU must be at most 100 characters")
        String sku,
        @NotBlank(message = "Product variant size label is required")
        @Size(max = 80, message = "Product variant size label must be at most 80 characters")
        String sizeLabel,
        @NotBlank(message = "Product variant color name is required")
        @Size(max = 80, message = "Product variant color name must be at most 80 characters")
        String colorName,
        @NotNull(message = "Product variant stock quantity is required")
        @Min(value = 0, message = "Product variant stock quantity must be zero or greater")
        Integer stockQuantity,
        @NotNull(message = "Product variant price is required")
        @DecimalMin(value = "0.00", inclusive = true, message = "Product variant price must be zero or greater")
        BigDecimal price,
        @NotBlank(message = "Product variant currency is required")
        @Size(min = 3, max = 3, message = "Product variant currency must be exactly 3 characters")
        String currency,
        @NotNull(message = "Product variant active flag is required")
        Boolean active
) {
}
