package com.babyshop.analytics;

import com.babyshop.analytics.dto.AnalyticsSummaryResponse;
import com.babyshop.analytics.dto.AnalyticsSummaryResponse.DailySales;
import com.babyshop.analytics.dto.AnalyticsSummaryResponse.StatusCount;
import com.babyshop.analytics.dto.AnalyticsSummaryResponse.TopProduct;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.category.CategoryRepository;
import com.babyshop.order.Order;
import com.babyshop.order.OrderRepository;
import com.babyshop.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Computes aggregated metrics for the admin Analytics dashboard from the order,
 * product, category and user data. All amounts are reported in TRY.
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final Set<String> REVENUE_STATUSES =
            Set.of("PAID", "PREPARING", "SHIPPED", "DELIVERED");
    private static final int TOP_PRODUCT_LIMIT = 5;
    private static final int DEFAULT_SALES_WINDOW_DAYS = 7;
    private static final int MAX_SALES_WINDOW_DAYS = 90;
    private static final ZoneId STORE_ZONE = ZoneId.of("Europe/Istanbul");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse getSummary() {
        return getSummary(DEFAULT_SALES_WINDOW_DAYS);
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse getSummary(int salesWindowDays) {
        int windowDays = Math.min(Math.max(salesWindowDays, 1), MAX_SALES_WINDOW_DAYS);
        OrderRepository.RevenueAggregateView revenue = orderRepository.aggregateRevenue(REVENUE_STATUSES);
        BigDecimal totalRevenue = revenue.getRevenue() == null ? BigDecimal.ZERO : revenue.getRevenue();
        long paidOrders = revenue.getCount();
        long totalOrders = orderRepository.count();

        BigDecimal averageOrderValue = paidOrders == 0
                ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(paidOrders), 2, RoundingMode.HALF_UP);

        List<StatusCount> ordersByStatus = orderRepository.countOrdersByStatus().stream()
                .map(view -> new StatusCount(view.getStatus(), view.getCount()))
                .sorted(Comparator.comparingLong(StatusCount::count).reversed())
                .toList();

        List<TopProduct> topProducts = orderRepository
                .findTopProducts(REVENUE_STATUSES, PageRequest.of(0, TOP_PRODUCT_LIMIT)).stream()
                .map(view -> new TopProduct(view.getProductName(), view.getQuantity(), view.getRevenue()))
                .toList();

        List<DailySales> dailySales = computeDailySales(windowDays);

        long totalProducts = productRepository.count();
        long activeProducts = productRepository.countByActiveTrue();
        long totalCategories = categoryRepository.count();
        long totalCustomers = userAccountRepository.countByRoleName(CUSTOMER_ROLE);

        return new AnalyticsSummaryResponse(
                totalRevenue,
                totalOrders,
                paidOrders,
                averageOrderValue,
                totalCustomers,
                totalProducts,
                activeProducts,
                totalCategories,
                "TRY",
                ordersByStatus,
                topProducts,
                dailySales);
    }

    /**
     * Builds a revenue series for the last {@code windowDays} days (inclusive of today),
     * with a zero-filled entry for every day so the chart always has a full window.
     */
    private List<DailySales> computeDailySales(int windowDays) {
        LocalDate today = LocalDate.now(STORE_ZONE);
        LocalDate windowStart = today.minusDays(windowDays - 1L);

        // Yalnizca pencere icindeki gelir siparislerini cek (sinirli kume), gun bazinda topla.
        OffsetDateTime windowStartInstant = windowStart.atStartOfDay(STORE_ZONE).toOffsetDateTime();
        List<Order> revenueOrders = orderRepository.findRevenueOrdersSince(REVENUE_STATUSES, windowStartInstant);

        Map<LocalDate, BigDecimal> revenueByDay = new LinkedHashMap<>();
        for (int i = 0; i < windowDays; i++) {
            revenueByDay.put(windowStart.plusDays(i), BigDecimal.ZERO);
        }

        for (Order order : revenueOrders) {
            if (order.getCreatedAt() == null) {
                continue;
            }
            LocalDate day = order.getCreatedAt().atZoneSameInstant(STORE_ZONE).toLocalDate();
            if (revenueByDay.containsKey(day)) {
                revenueByDay.merge(day, order.getTotalAmount(), BigDecimal::add);
            }
        }

        return revenueByDay.entrySet().stream()
                .map(entry -> new DailySales(entry.getKey(), entry.getValue()))
                .toList();
    }
}
