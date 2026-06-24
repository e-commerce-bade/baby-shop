package com.babyshop.common.request;

import jakarta.validation.constraints.NotNull;

/** Aktif/pasif durum guncellemeleri icin govde (ham JSON primitive yerine). */
public record ActiveStatusRequest(
        @NotNull(message = "Active flag is required")
        Boolean active
) {
}
