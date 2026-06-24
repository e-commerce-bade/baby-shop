package com.babyshop.customer;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.response.PageResponse;
import com.babyshop.customer.dto.CustomerStatsResponse;
import com.babyshop.customer.dto.CustomerSummaryResponse;
import com.babyshop.order.OrderRepository;
import com.babyshop.order.OrderRepository.CustomerOrderAggregateView;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Admin "Customers" view: registered shop customers (CUSTOMER role) enriched with
 * order counts and lifetime spend. Pagination, search and the per-customer order
 * aggregates are pushed to SQL instead of loading every user and order into memory.
 */
@Service
@RequiredArgsConstructor
public class CustomerAdminService {

    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    /** Statuses that represent realized revenue (everything except pending/cancelled). */
    private static final Set<String> REVENUE_STATUSES =
            Set.of("PAID", "PREPARING", "SHIPPED", "DELIVERED");

    private final UserAccountRepository userAccountRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public PageResponse<CustomerSummaryResponse> getCustomers(String search, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        String query = (search == null || search.isBlank())
                ? null
                : "%" + search.trim().toLowerCase(Locale.ROOT) + "%";

        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserAccount> users = userAccountRepository.findCustomers(query, pageable);

        // Yalnizca bu sayfadaki musterilerin siparis agregalarini cek (tum tabloyu degil).
        List<String> emails = users.getContent().stream()
                .map(user -> normalizeEmail(user.getEmail()))
                .toList();
        Map<String, CustomerOrderAggregateView> aggregatesByEmail = emails.isEmpty()
                ? Map.of()
                : orderRepository.aggregateByCustomerEmails(emails, REVENUE_STATUSES).stream()
                        .collect(Collectors.toMap(
                                view -> normalizeEmail(view.getEmail()),
                                Function.identity()));

        List<CustomerSummaryResponse> content = users.getContent().stream()
                .map(user -> toResponse(user, aggregatesByEmail.get(normalizeEmail(user.getEmail()))))
                .toList();

        return new PageResponse<>(
                content,
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages(),
                users.hasNext(),
                users.hasPrevious());
    }

    @Transactional(readOnly = true)
    public CustomerStatsResponse getCustomerStats() {
        long totalCustomers = userAccountRepository.countByRoleName(CUSTOMER_ROLE);
        long customersWithOrders = userAccountRepository.countCustomersWithOrders();
        BigDecimal totalRevenue = orderRepository.aggregateRevenue(REVENUE_STATUSES).getRevenue();
        return new CustomerStatsResponse(
                totalCustomers,
                customersWithOrders,
                totalRevenue == null ? BigDecimal.ZERO : totalRevenue,
                "TRY");
    }

    private CustomerSummaryResponse toResponse(UserAccount user, CustomerOrderAggregateView aggregate) {
        BigDecimal totalSpent = aggregate == null || aggregate.getTotalSpent() == null
                ? BigDecimal.ZERO
                : aggregate.getTotalSpent();

        return new CustomerSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.isActive(),
                aggregate == null ? 0L : aggregate.getOrderCount(),
                totalSpent,
                "TRY",
                user.getCreatedAt(),
                aggregate == null ? null : aggregate.getLastOrderAt());
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
