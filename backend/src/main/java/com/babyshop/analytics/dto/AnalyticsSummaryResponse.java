package com.babyshop.analytics.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Aggregated store metrics for the admin Analytics dashboard.
 */
public record AnalyticsSummaryResponse(
        BigDecimal totalRevenue,
        long totalOrders,
        long paidOrders,
        BigDecimal averageOrderValue,
        long totalCustomers,
        long totalProducts,
        long activeProducts,
        long totalCategories,
        String currency,
        List<StatusCount> ordersByStatus,
        List<TopProduct> topProducts
) {
    public record StatusCount(String status, long count) {
    }

    public record TopProduct(String productName, long quantity, BigDecimal revenue) {
    }
}
