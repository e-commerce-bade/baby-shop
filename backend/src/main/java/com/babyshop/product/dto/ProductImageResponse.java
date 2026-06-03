package com.babyshop.product.dto;

public record ProductImageResponse(
        Long id,
        String imageUrl,
        String altText,
        String colorName,
        int sortOrder,
        boolean primary
) {
    public ProductImageResponse(Long id, String imageUrl, String altText, int sortOrder, boolean primary) {
        this(id, imageUrl, altText, null, sortOrder, primary);
    }
}
