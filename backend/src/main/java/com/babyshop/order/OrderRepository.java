package com.babyshop.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"items"})
    Optional<Order> findByOrderNumber(String orderNumber);

    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByUserEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    @Override
    @EntityGraph(attributePaths = {"items"})
    Page<Order> findAll(Specification<Order> specification, Pageable pageable);

    // --- Analitik agregalari (tum tabloyu bellege cekmeden SQL'de hesaplanir) ---

    @Query("select coalesce(sum(o.totalAmount), 0) as revenue, count(o) as count "
            + "from Order o where o.status in :statuses")
    RevenueAggregateView aggregateRevenue(@Param("statuses") Collection<String> statuses);

    @Query("select o.status as status, count(o) as count from Order o group by o.status")
    List<StatusCountView> countOrdersByStatus();

    @Query("select oi.productName as productName, sum(oi.quantity) as quantity, sum(oi.lineTotal) as revenue "
            + "from OrderItem oi where oi.order.status in :statuses "
            + "group by oi.productName order by sum(oi.quantity) desc")
    List<TopProductView> findTopProducts(@Param("statuses") Collection<String> statuses, Pageable pageable);

    // Yalnizca verilen tarihten sonraki gelir siparisleri (gunluk satis penceresi icin sinirli kume).
    @Query("select o from Order o where o.status in :statuses and o.createdAt >= :start")
    List<Order> findRevenueOrdersSince(
            @Param("statuses") Collection<String> statuses,
            @Param("start") OffsetDateTime start);

    // Admin musteri listesi icin: verilen e-postalar bazinda siparis sayisi/harcama/son siparis.
    @Query("select lower(o.customerEmail) as email, count(o) as orderCount, max(o.createdAt) as lastOrderAt, "
            + "sum(case when o.status in :statuses then o.totalAmount else 0 end) as totalSpent "
            + "from Order o where lower(o.customerEmail) in :emails group by lower(o.customerEmail)")
    List<CustomerOrderAggregateView> aggregateByCustomerEmails(
            @Param("emails") Collection<String> emails,
            @Param("statuses") Collection<String> statuses);

    interface CustomerOrderAggregateView {
        String getEmail();
        long getOrderCount();
        OffsetDateTime getLastOrderAt();
        BigDecimal getTotalSpent();
    }

    interface RevenueAggregateView {
        BigDecimal getRevenue();
        long getCount();
    }

    interface StatusCountView {
        String getStatus();
        long getCount();
    }

    interface TopProductView {
        String getProductName();
        long getQuantity();
        BigDecimal getRevenue();
    }
}
