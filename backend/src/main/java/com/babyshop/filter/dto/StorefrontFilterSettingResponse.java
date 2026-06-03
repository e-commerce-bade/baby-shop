package com.babyshop.filter.dto;

public record StorefrontFilterSettingResponse(
        String key,
        String label,
        boolean enabled,
        int sortOrder
) {
}
