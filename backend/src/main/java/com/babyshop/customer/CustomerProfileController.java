package com.babyshop.customer;

import com.babyshop.customer.dto.CustomerProfileUpdateRequest;
import com.babyshop.customer.dto.CustomerProfileResponse;
import com.babyshop.order.dto.OrderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    @GetMapping
    public ResponseEntity<CustomerProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(customerProfileService.getProfile(authentication.getName()));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Authentication authentication) {
        return ResponseEntity.ok(customerProfileService.getOrders(authentication.getName()));
    }

    @PatchMapping
    public ResponseEntity<CustomerProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody CustomerProfileUpdateRequest request
    ) {
        return ResponseEntity.ok(customerProfileService.updateProfile(authentication.getName(), request));
    }
}
