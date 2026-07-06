package com.babyshop.settings;

import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.settings.dto.StoreSettingResponse;
import com.babyshop.settings.dto.StoreSettingUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

/**
 * Mağaza ayarlarını (kargo ücreti / ücretsiz kargo eşiği / minimum sepet tutarı / ödeme
 * seçenekleri / kargo firmaları) okur, günceller ve sepet ara toplamına göre kargo ücretini
 * hesaplar. Tek satırlık ayar kaydını yönetir.
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
        setting.setMinimumOrderAmount(request.minimumOrderAmount());
        setting.setCardEnabled(request.cardEnabled());
        setting.setCodEnabled(request.codEnabled());
        setting.setCodSurcharge(request.codSurcharge());
        setting.setBankTransferEnabled(request.bankTransferEnabled());
        setting.setBankTransferIban(trimToNull(request.bankTransferIban()));
        setting.setBankTransferAccountName(trimToNull(request.bankTransferAccountName()));
        setting.setBankTransferBankName(trimToNull(request.bankTransferBankName()));
        setting.setShippingCarriers(normalizeCarriers(request.shippingCarriers()));
        return toResponse(repository.save(setting));
    }

    public BigDecimal getFreeShippingThreshold() {
        return loadSettings().getFreeShippingThreshold();
    }

    public BigDecimal getMinimumOrderAmount() {
        BigDecimal value = loadSettings().getMinimumOrderAmount();
        return value == null ? BigDecimal.ZERO : value;
    }

    public boolean isCardEnabled() {
        return loadSettings().isCardEnabled();
    }

    public boolean isCodEnabled() {
        return loadSettings().isCodEnabled();
    }

    public boolean isBankTransferEnabled() {
        return loadSettings().isBankTransferEnabled();
    }

    public BigDecimal getCodSurcharge() {
        BigDecimal value = loadSettings().getCodSurcharge();
        return value == null ? BigDecimal.ZERO : value;
    }

    public List<String> getShippingCarriers() {
        return parseCarriers(loadSettings().getShippingCarriers());
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
                setting.getMinimumOrderAmount(),
                setting.isCardEnabled(),
                setting.isCodEnabled(),
                setting.getCodSurcharge(),
                setting.isBankTransferEnabled(),
                setting.getBankTransferIban(),
                setting.getBankTransferAccountName(),
                setting.getBankTransferBankName(),
                parseCarriers(setting.getShippingCarriers()),
                CURRENCY,
                setting.getUpdatedAt()
        );
    }

    /** CSV kargo firmasi listesini temizler; her satiri trim eder, boslari ve tekrarlari atar. */
    private List<String> parseCarriers(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    /** Admin girisini (satir/virgul karisik olabilir) normalize edilmis CSV'ye cevirir. */
    private String normalizeCarriers(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        List<String> carriers = Arrays.stream(raw.split("[,\\n]"))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
        return String.join(",", carriers);
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
