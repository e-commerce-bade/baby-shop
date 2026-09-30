package com.babyshop.product.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ProductVariantBulkDeleteRequest(
        @NotEmpty(message = "En az bir varyant seçilmelidir")
        @Size(max = 2000, message = "Tek seferde en fazla 2000 varyant silinebilir")
        List<@NotNull Long> ids
) {
}
