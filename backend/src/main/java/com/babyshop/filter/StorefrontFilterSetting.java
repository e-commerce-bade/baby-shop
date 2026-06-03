package com.babyshop.filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "storefront_filter_settings")
public class StorefrontFilterSetting {

    @Id
    @Column(name = "filter_key", nullable = false, length = 80)
    private String key;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
