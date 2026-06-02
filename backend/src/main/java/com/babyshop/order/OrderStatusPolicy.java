package com.babyshop.order;

import com.babyshop.common.exception.InvalidRequestException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class OrderStatusPolicy {

    public static final String PENDING_PAYMENT = "PENDING_PAYMENT";
    public static final String PAID = "PAID";
    public static final String PREPARING = "PREPARING";
    public static final String SHIPPED = "SHIPPED";
    public static final String DELIVERED = "DELIVERED";
    public static final String CANCELLED = "CANCELLED";

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            PENDING_PAYMENT, Set.of(PAID, CANCELLED),
            PAID, Set.of(PREPARING, CANCELLED),
            PREPARING, Set.of(SHIPPED, CANCELLED),
            SHIPPED, Set.of(DELIVERED),
            DELIVERED, Set.of(),
            CANCELLED, Set.of()
    );

    private OrderStatusPolicy() {
    }

    public static String normalizeRequiredStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new InvalidRequestException("Order status is required");
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_TRANSITIONS.containsKey(normalized)) {
            throw new InvalidRequestException("Unsupported order status: " + normalized);
        }

        return normalized;
    }

    public static void validateTransition(String currentStatus, String targetStatus) {
        String normalizedCurrentStatus = normalizeRequiredStatus(currentStatus);
        String normalizedTargetStatus = normalizeRequiredStatus(targetStatus);

        if (normalizedCurrentStatus.equals(normalizedTargetStatus)) {
            return;
        }

        if (!ALLOWED_TRANSITIONS.getOrDefault(normalizedCurrentStatus, Set.of()).contains(normalizedTargetStatus)) {
            throw new InvalidRequestException(
                    "Invalid order status transition: " + normalizedCurrentStatus + " -> " + normalizedTargetStatus
            );
        }
    }

    public static List<String> statuses() {
        return List.copyOf(ALLOWED_TRANSITIONS.keySet());
    }
}
