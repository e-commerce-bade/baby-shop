package com.babyshop.filter;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorefrontFilterSettingRepository extends JpaRepository<StorefrontFilterSetting, String> {

    List<StorefrontFilterSetting> findAllByOrderBySortOrderAsc();
}
