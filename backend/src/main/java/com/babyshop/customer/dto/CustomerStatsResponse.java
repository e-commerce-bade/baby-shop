package com.babyshop.customer.dto;

import java.math.BigDecimal;

/** Admin musteri ekrani ust ozet kartlari (tum musteriler uzerinden, SQL ile hesaplanir). */
public record CustomerStatsResponse(
        long totalCustomers,
        long customersWithOrders,
        BigDecimal totalRevenue,
        String currency
) {
}
