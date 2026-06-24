package com.babyshop.settings;

import com.babyshop.settings.dto.StoreSettingResponse;
import com.babyshop.settings.dto.StoreSettingUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mağaza ayarları. Okuma herkese açık (storefront kargo bilgisini gösterir),
 * güncelleme yalnızca ADMIN'e (path bazlı /api/v1/admin/** kuralı ile).
 */
@RestController
@RequiredArgsConstructor
public class StoreSettingController {

    private final StoreSettingService service;

    @GetMapping("/api/v1/store-settings")
    public ResponseEntity<StoreSettingResponse> getPublicSettings() {
        return ResponseEntity.ok(service.getSettings());
    }

    @GetMapping("/api/v1/admin/store-settings")
    public ResponseEntity<StoreSettingResponse> getAdminSettings() {
        return ResponseEntity.ok(service.getSettings());
    }

    @PutMapping("/api/v1/admin/store-settings")
    public ResponseEntity<StoreSettingResponse> updateSettings(
            @Valid @RequestBody StoreSettingUpdateRequest request
    ) {
        return ResponseEntity.ok(service.updateSettings(request));
    }
}
