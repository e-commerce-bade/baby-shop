package com.babyshop.analytics;

import com.babyshop.analytics.dto.AnalyticsSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin analytics endpoint. Secured by the path-level rule in SecurityConfig:
 * /api/v1/admin/** requires ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class AnalyticsAdminController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryResponse> getSummary(
            @RequestParam(name = "days", defaultValue = "7") int days
    ) {
        return ResponseEntity.ok(analyticsService.getSummary(days));
    }
}
