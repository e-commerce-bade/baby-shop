package com.babyshop.filter.dto;

import jakarta.validation.constraints.NotNull;

public record StorefrontFilterSettingUpdateRequest(
        @NotNull(message = "Filter enabled flag is required")
        Boolean enabled
) {
}
