package com.babyshop.filter;

import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.filter.dto.StorefrontFilterSettingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StorefrontFilterSettingService {

    private final StorefrontFilterSettingRepository repository;

    public List<StorefrontFilterSettingResponse> getSettings() {
        return repository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public StorefrontFilterSettingResponse updateSetting(String key, boolean enabled) {
        StorefrontFilterSetting setting = repository.findById(key)
                .orElseThrow(() -> new ResourceNotFoundException("Filter setting not found for key: " + key));
        setting.setEnabled(enabled);
        return toResponse(repository.save(setting));
    }

    private StorefrontFilterSettingResponse toResponse(StorefrontFilterSetting setting) {
        return new StorefrontFilterSettingResponse(
                setting.getKey(),
                setting.getLabel(),
                setting.isEnabled(),
                setting.getSortOrder()
        );
    }
}
