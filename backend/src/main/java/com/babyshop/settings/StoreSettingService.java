package com.babyshop.settings;

import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.settings.dto.StoreSettingResponse;
import com.babyshop.settings.dto.StoreSettingUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Mağaza ayarlarını (kargo ücreti / ücretsiz kargo eşiği) okur, günceller ve
 * sepet ara toplamına göre kargo ücretini hesaplar. Tek satırlık ayar kaydını yönetir.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreSettingService {

    private static final String CURRENCY = "TRY";

    private final StoreSettingRepository repository;

    public StoreSettingResponse getSettings() {
        return toResponse(loadSettings());
    }

    @Transactional
    public StoreSettingResponse updateSettings(StoreSettingUpdateRequest request) {
        StoreSetting setting = loadSettings();
        setting.setFreeShippingThreshold(request.freeShippingThreshold());
        setting.setShippingFee(request.shippingFee());
        return toResponse(repository.save(setting));
    }

    public BigDecimal getFreeShippingThreshold() {
        return loadSettings().getFreeShippingThreshold();
    }

    /**
     * Sepet ara toplamına göre kargo ücreti: boş sepette veya eşik (dahil) üzerinde 0,
     * aksi halde sabit kargo ücreti.
     */
    public BigDecimal calculateShipping(BigDecimal subtotal) {
        if (subtotal == null || subtotal.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        StoreSetting setting = loadSettings();
        return subtotal.compareTo(setting.getFreeShippingThreshold()) >= 0
                ? BigDecimal.ZERO
                : setting.getShippingFee();
    }

    private StoreSetting loadSettings() {
        return repository.findById(StoreSetting.SINGLETON_ID)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza ayarları bulunamadı."));
    }

    private StoreSettingResponse toResponse(StoreSetting setting) {
        return new StoreSettingResponse(
                setting.getFreeShippingThreshold(),
                setting.getShippingFee(),
                CURRENCY,
                setting.getUpdatedAt()
        );
    }
}
