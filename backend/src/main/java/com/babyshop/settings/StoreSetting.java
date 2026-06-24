package com.babyshop.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Mağaza geneli ayarlar. Tek satırlık kayıt (id = 1) olarak tutulur.
 */
@Getter
@Setter
@Entity
@Table(name = "store_settings")
public class StoreSetting {

    /** Singleton satır; her zaman 1. */
    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Column(name = "free_shipping_threshold", nullable = false, precision = 12, scale = 2)
    private BigDecimal freeShippingThreshold;

    @Column(name = "shipping_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingFee;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private OffsetDateTime updatedAt;
}
