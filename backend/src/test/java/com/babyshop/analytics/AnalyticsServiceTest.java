package com.babyshop.analytics;

import com.babyshop.analytics.dto.AnalyticsSummaryResponse;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.category.CategoryRepository;
import com.babyshop.order.OrderRepository;
import com.babyshop.order.OrderStatusPolicy;
import com.babyshop.product.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @InjectMocks
    private AnalyticsService analyticsService;

    @Test
    void shouldExcludeAbandonedCheckoutsFromOrderCountAndStatusBreakdown() {
        given(orderRepository.aggregateRevenue(anyCollection()))
                .willReturn(revenueView(new BigDecimal("246524.80"), 137));
        given(orderRepository.countByStatusNot(OrderStatusPolicy.EXPIRED)).willReturn(212L);
        given(orderRepository.countByStatus(OrderStatusPolicy.EXPIRED)).willReturn(25L);
        given(orderRepository.countOrdersByStatus()).willReturn(List.of(
                statusView(OrderStatusPolicy.SHIPPED, 133),
                statusView(OrderStatusPolicy.CANCELLED, 75),
                statusView(OrderStatusPolicy.EXPIRED, 25),
                statusView(OrderStatusPolicy.PAID, 2)));
        given(orderRepository.findTopProducts(anyCollection(), any(Pageable.class))).willReturn(List.of());
        given(orderRepository.findRevenueOrdersSince(anyCollection(), any(OffsetDateTime.class)))
                .willReturn(List.of());

        AnalyticsSummaryResponse summary = analyticsService.getSummary();

        // EXPIRED siparisler toplam siparise sayilmaz, ayri metrik olarak raporlanir.
        assertThat(summary.totalOrders()).isEqualTo(212);
        assertThat(summary.abandonedCheckouts()).isEqualTo(25);
        assertThat(summary.ordersByStatus())
                .extracting(AnalyticsSummaryResponse.StatusCount::status)
                .containsExactly(OrderStatusPolicy.SHIPPED, OrderStatusPolicy.CANCELLED, OrderStatusPolicy.PAID);
    }

    @Test
    void shouldDeriveAverageOrderValueFromPaidOrdersOnly() {
        given(orderRepository.aggregateRevenue(anyCollection()))
                .willReturn(revenueView(new BigDecimal("246524.80"), 137));
        given(orderRepository.countOrdersByStatus()).willReturn(List.of());
        given(orderRepository.findTopProducts(anyCollection(), any(Pageable.class))).willReturn(List.of());
        given(orderRepository.findRevenueOrdersSince(anyCollection(), any(OffsetDateTime.class)))
                .willReturn(List.of());

        AnalyticsSummaryResponse summary = analyticsService.getSummary();

        assertThat(summary.totalRevenue()).isEqualByComparingTo("246524.80");
        assertThat(summary.paidOrders()).isEqualTo(137);
        assertThat(summary.averageOrderValue()).isEqualByComparingTo("1799.45");
    }

    private OrderRepository.RevenueAggregateView revenueView(BigDecimal revenue, long count) {
        return new OrderRepository.RevenueAggregateView() {
            @Override
            public BigDecimal getRevenue() {
                return revenue;
            }

            @Override
            public long getCount() {
                return count;
            }
        };
    }

    private OrderRepository.StatusCountView statusView(String status, long count) {
        return new OrderRepository.StatusCountView() {
            @Override
            public String getStatus() {
                return status;
            }

            @Override
            public long getCount() {
                return count;
            }
        };
    }
}
