package com.babyshop.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductAdminRequest(
        @NotNull(message = "Product category is required")
        Long categoryId,
        @NotBlank(message = "Product name is required")
        @Size(max = 200, message = "Product name must be at most 200 characters")
        String name,
        @NotBlank(message = "Product slug is required")
        @Size(max = 220, message = "Product slug must be at most 220 characters")
        String slug,
        @Size(max = 4000, message = "Product description must be at most 4000 characters")
        String description,
        @Size(max = 120, message = "Product brand must be at most 120 characters")
        String brand,
        @NotNull(message = "Product active flag is required")
        Boolean active
) {
}
