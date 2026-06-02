package com.babyshop.customer;

import com.babyshop.common.response.PageResponse;
import com.babyshop.customer.dto.CustomerProfileUpdateRequest;
import com.babyshop.customer.dto.CustomerProfileResponse;
import com.babyshop.order.dto.OrderResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Validated
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    @GetMapping
    public ResponseEntity<CustomerProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(customerProfileService.getProfile(authentication.getName()));
    }

    @GetMapping("/orders")
    public ResponseEntity<PageResponse<OrderResponse>> getMyOrders(
            Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(value = 0, message = "Order page must be zero or greater") int page,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "Order page size must be at least 1")
            @Max(value = 100, message = "Order page size must be at most 100") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(customerProfileService.getOrders(authentication.getName(), page, size, status, from, to));
    }

    @PatchMapping
    public ResponseEntity<CustomerProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody CustomerProfileUpdateRequest request
    ) {
        return ResponseEntity.ok(customerProfileService.updateProfile(authentication.getName(), request));
    }
}
