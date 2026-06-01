package com.babyshop.product.dto;

public record ProductImageResponse(
        Long id,
        String imageUrl,
        String altText,
        int sortOrder,
        boolean primary
) {
}
