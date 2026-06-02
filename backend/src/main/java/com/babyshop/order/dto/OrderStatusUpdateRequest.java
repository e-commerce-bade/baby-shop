package com.babyshop.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrderStatusUpdateRequest(
        @NotBlank(message = "Order status is required")
        @Size(max = 30, message = "Order status must be at most 30 characters")
        String status
) {
}
