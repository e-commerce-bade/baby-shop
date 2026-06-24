package com.babyshop.customer;

import com.babyshop.common.response.PageResponse;
import com.babyshop.customer.dto.CustomerStatsResponse;
import com.babyshop.customer.dto.CustomerSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin endpoint for browsing registered shop customers. Secured by the
 * path-level rule in SecurityConfig: /api/v1/admin/** requires ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/customers")
@RequiredArgsConstructor
public class CustomerAdminController {

    private final CustomerAdminService customerAdminService;

    @GetMapping
    public ResponseEntity<PageResponse<CustomerSummaryResponse>> getCustomers(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(customerAdminService.getCustomers(q, page, size));
    }

    @GetMapping("/stats")
    public ResponseEntity<CustomerStatsResponse> getStats() {
        return ResponseEntity.ok(customerAdminService.getCustomerStats());
    }
}
