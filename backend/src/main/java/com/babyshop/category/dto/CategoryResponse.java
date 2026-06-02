package com.babyshop.category.dto;

public record CategoryResponse(
        Long id,
        Long parentId,
        String name,
        String slug,
        String description,
        boolean active,
        int sortOrder
) {
}
