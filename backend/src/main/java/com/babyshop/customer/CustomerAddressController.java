package com.babyshop.customer;

import com.babyshop.customer.dto.CustomerAddressRequest;
import com.babyshop.customer.dto.CustomerAddressResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/addresses")
@RequiredArgsConstructor
public class CustomerAddressController {

    private final CustomerAddressService customerAddressService;

    @GetMapping
    public ResponseEntity<List<CustomerAddressResponse>> getAddresses(Authentication authentication) {
        return ResponseEntity.ok(customerAddressService.getAddresses(authentication.getName()));
    }

    @GetMapping("/{addressId}")
    public ResponseEntity<CustomerAddressResponse> getAddressById(
            Authentication authentication,
            @PathVariable Long addressId
    ) {
        return ResponseEntity.ok(customerAddressService.getAddressById(authentication.getName(), addressId));
    }

    @PostMapping
    public ResponseEntity<CustomerAddressResponse> createAddress(
            Authentication authentication,
            @Valid @RequestBody CustomerAddressRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerAddressService.createAddress(authentication.getName(), request));
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<CustomerAddressResponse> updateAddress(
            Authentication authentication,
            @PathVariable Long addressId,
            @Valid @RequestBody CustomerAddressRequest request
    ) {
        return ResponseEntity.ok(customerAddressService.updateAddress(authentication.getName(), addressId, request));
    }

    @PatchMapping("/{addressId}/default")
    public ResponseEntity<CustomerAddressResponse> setDefaultAddress(
            Authentication authentication,
            @PathVariable Long addressId
    ) {
        return ResponseEntity.ok(customerAddressService.setDefaultAddress(authentication.getName(), addressId));
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> deleteAddress(Authentication authentication, @PathVariable Long addressId) {
        customerAddressService.deleteAddress(authentication.getName(), addressId);
        return ResponseEntity.noContent().build();
    }
}
