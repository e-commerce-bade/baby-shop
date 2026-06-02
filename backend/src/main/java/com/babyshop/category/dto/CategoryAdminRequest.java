package com.babyshop.category.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoryAdminRequest(
        Long parentId,
        @NotBlank(message = "Category name is required")
        @Size(max = 150, message = "Category name must be at most 150 characters")
        String name,
        @NotBlank(message = "Category slug is required")
        @Size(max = 180, message = "Category slug must be at most 180 characters")
        String slug,
        @Size(max = 2000, message = "Category description must be at most 2000 characters")
        String description,
        @NotNull(message = "Category active flag is required")
        Boolean active,
        @NotNull(message = "Category sort order is required")
        @Min(value = 0, message = "Category sort order must be zero or greater")
        Integer sortOrder
) {
}
