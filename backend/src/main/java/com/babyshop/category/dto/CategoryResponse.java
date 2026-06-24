package com.babyshop.category.dto;

import java.time.OffsetDateTime;

public record CategoryResponse(
        Long id,
        Long parentId,
        String name,
        String slug,
        String description,
        boolean active,
        int sortOrder,
        long productCount,
        OffsetDateTime updatedAt
) {
}
