package com.babyshop.customer;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.common.response.PageResponse;
import com.babyshop.customer.dto.CustomerProfileResponse;
import com.babyshop.customer.dto.CustomerProfileUpdateRequest;
import com.babyshop.order.OrderService;
import com.babyshop.order.dto.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerProfileService {

    private final UserAccountRepository userAccountRepository;
    private final OrderService orderService;

    public CustomerProfileResponse getProfile(String email) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found for email: " + email));
        return toResponse(user);
    }

    public List<OrderResponse> getOrders(String email) {
        return orderService.getOrdersByUserEmail(normalizeEmail(email));
    }

    public PageResponse<OrderResponse> getOrders(
            String email,
            int page,
            int size,
            String status,
            LocalDate from,
            LocalDate to
    ) {
        return orderService.getOrdersByUserEmail(normalizeEmail(email), page, size, status, from, to);
    }

    @Transactional
    public CustomerProfileResponse updateProfile(String email, CustomerProfileUpdateRequest request) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found for email: " + email));

        user.setFirstName(trimToNull(request.firstName()));
        user.setLastName(trimToNull(request.lastName()));
        user.setPhoneNumber(trimToNull(request.phoneNumber()));

        return toResponse(userAccountRepository.save(user));
    }

    private CustomerProfileResponse toResponse(UserAccount user) {
        Set<String> roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(java.util.stream.Collectors.toCollection(TreeSet::new));

        return new CustomerProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.isActive(),
                roles
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
