package com.babyshop.customer;

import com.babyshop.auth.Role;
import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.customer.dto.CustomerSummaryResponse;
import com.babyshop.order.Order;
import com.babyshop.order.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Builds the admin "Customers" view: registered shop customers (users that hold
 * the CUSTOMER role) enriched with order counts and lifetime spend, computed by
 * joining users to orders on the (denormalized) customer email.
 */
@Service
@RequiredArgsConstructor
public class CustomerAdminService {

    private static final String CUSTOMER_ROLE = "CUSTOMER";

    /** Statuses that represent realized revenue (everything except pending/cancelled). */
    private static final Set<String> REVENUE_STATUSES =
            Set.of("PAID", "PREPARING", "SHIPPED", "DELIVERED");

    private final UserAccountRepository userAccountRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<CustomerSummaryResponse> getAllCustomers() {
        List<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc();

        Map<String, Long> orderCountByEmail = orders.stream()
                .collect(Collectors.groupingBy(
                        order -> normalizeEmail(order.getCustomerEmail()),
                        Collectors.counting()));

        Map<String, BigDecimal> spentByEmail = orders.stream()
                .filter(order -> REVENUE_STATUSES.contains(order.getStatus()))
                .collect(Collectors.groupingBy(
                        order -> normalizeEmail(order.getCustomerEmail()),
                        Collectors.reducing(BigDecimal.ZERO, Order::getTotalAmount, BigDecimal::add)));

        // Most recent order timestamp per customer (orders are sorted desc, so first wins)
        Map<String, OffsetDateTime> lastOrderByEmail = orders.stream()
                .collect(Collectors.toMap(
                        order -> normalizeEmail(order.getCustomerEmail()),
                        Order::getCreatedAt,
                        (existing, ignored) -> existing));

        return userAccountRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(this::isCustomer)
                .map(user -> toResponse(user, orderCountByEmail, spentByEmail, lastOrderByEmail))
                .toList();
    }

    private boolean isCustomer(UserAccount user) {
        return user.getRoles().stream()
                .map(Role::getName)
                .anyMatch(CUSTOMER_ROLE::equalsIgnoreCase);
    }

    private CustomerSummaryResponse toResponse(
            UserAccount user,
            Map<String, Long> orderCountByEmail,
            Map<String, BigDecimal> spentByEmail,
            Map<String, OffsetDateTime> lastOrderByEmail) {
        String email = normalizeEmail(user.getEmail());
        return new CustomerSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.isActive(),
                orderCountByEmail.getOrDefault(email, 0L),
                spentByEmail.getOrDefault(email, BigDecimal.ZERO),
                "TRY",
                user.getCreatedAt(),
                lastOrderByEmail.get(email));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
