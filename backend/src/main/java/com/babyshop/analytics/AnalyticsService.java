package com.babyshop.analytics;

import com.babyshop.analytics.dto.AnalyticsSummaryResponse;
import com.babyshop.analytics.dto.AnalyticsSummaryResponse.DailySales;
import com.babyshop.analytics.dto.AnalyticsSummaryResponse.StatusCount;
import com.babyshop.analytics.dto.AnalyticsSummaryResponse.TopProduct;
import com.babyshop.auth.Role;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.category.CategoryRepository;
import com.babyshop.order.Order;
import com.babyshop.order.OrderItem;
import com.babyshop.order.OrderRepository;
import com.babyshop.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
    private static final int SALES_WINDOW_DAYS = 7;
    private static final ZoneId STORE_ZONE = ZoneId.of("Europe/Istanbul");

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse getSummary() {
        List<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc();

        List<Order> revenueOrders = orders.stream()
                .filter(order -> REVENUE_STATUSES.contains(order.getStatus()))
                .toList();

        BigDecimal totalRevenue = revenueOrders.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalOrders = orders.size();
        long paidOrders = revenueOrders.size();

        BigDecimal averageOrderValue = paidOrders == 0
                ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(paidOrders), 2, RoundingMode.HALF_UP);

        List<StatusCount> ordersByStatus = orders.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        Order::getStatus, java.util.stream.Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new StatusCount(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(StatusCount::count).reversed())
                .toList();

        List<TopProduct> topProducts = computeTopProducts(orders);
        List<DailySales> dailySales = computeDailySales(revenueOrders);

        long totalProducts = productRepository.count();
        long activeProducts = productRepository.findAllByActiveTrueOrderByCreatedAtDesc().size();
        long totalCategories = categoryRepository.count();
        long totalCustomers = userAccountRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(user -> user.getRoles().stream()
                        .map(Role::getName)
                        .anyMatch(CUSTOMER_ROLE::equalsIgnoreCase))
                .count();

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
     * Builds a revenue series for the last {@value #SALES_WINDOW_DAYS} days (inclusive of today),
     * with a zero-filled entry for every day so the chart always has a full window.
     */
    private List<DailySales> computeDailySales(List<Order> revenueOrders) {
        LocalDate today = LocalDate.now(STORE_ZONE);
        LocalDate windowStart = today.minusDays(SALES_WINDOW_DAYS - 1L);

        Map<LocalDate, BigDecimal> revenueByDay = new LinkedHashMap<>();
        for (int i = 0; i < SALES_WINDOW_DAYS; i++) {
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

    private List<TopProduct> computeTopProducts(List<Order> orders) {
        Map<String, long[]> quantityByProduct = new LinkedHashMap<>();
        Map<String, BigDecimal> revenueByProduct = new LinkedHashMap<>();

        for (Order order : orders) {
            if (!REVENUE_STATUSES.contains(order.getStatus())) {
                continue;
            }
            for (OrderItem item : order.getItems()) {
                String name = item.getProductName();
                quantityByProduct.computeIfAbsent(name, key -> new long[1])[0] += item.getQuantity();
                revenueByProduct.merge(name, item.getLineTotal(), BigDecimal::add);
            }
        }

        return quantityByProduct.entrySet().stream()
                .map(entry -> new TopProduct(
                        entry.getKey(),
                        entry.getValue()[0],
                        revenueByProduct.getOrDefault(entry.getKey(), BigDecimal.ZERO)))
                .sorted(Comparator.comparingLong(TopProduct::quantity).reversed())
                .limit(TOP_PRODUCT_LIMIT)
                .toList();
    }
}
