package com.babyshop.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductImageAdminRequest(
        @NotBlank(message = "Product image URL is required")
        @Size(max = 500, message = "Product image URL must be at most 500 characters")
        String imageUrl,
        @Size(max = 255, message = "Product image alt text must be at most 255 characters")
        String altText,
        @NotNull(message = "Product image sort order is required")
        Integer sortOrder,
        @NotNull(message = "Product image primary flag is required")
        Boolean primary
) {
}
