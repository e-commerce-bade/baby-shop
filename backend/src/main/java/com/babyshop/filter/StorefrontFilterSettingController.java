package com.babyshop.filter;

import com.babyshop.filter.dto.StorefrontFilterSettingResponse;
import com.babyshop.filter.dto.StorefrontFilterSettingUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class StorefrontFilterSettingController {

    private final StorefrontFilterSettingService service;

    @GetMapping("/api/v1/filter-settings")
    public ResponseEntity<List<StorefrontFilterSettingResponse>> getPublicSettings() {
        return ResponseEntity.ok(service.getSettings());
    }

    @GetMapping("/api/v1/admin/filter-settings")
    public ResponseEntity<List<StorefrontFilterSettingResponse>> getAdminSettings() {
        return ResponseEntity.ok(service.getSettings());
    }

    @PatchMapping("/api/v1/admin/filter-settings/{key}")
    public ResponseEntity<StorefrontFilterSettingResponse> updateSetting(
            @PathVariable String key,
            @Valid @RequestBody StorefrontFilterSettingUpdateRequest request
    ) {
        return ResponseEntity.ok(service.updateSetting(key, request.enabled()));
    }
}
