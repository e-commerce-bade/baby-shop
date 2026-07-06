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

    /** Minimum sepet tutari; bu tutarin altinda siparis olusturulamaz. */
    @Column(name = "minimum_order_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal minimumOrderAmount;

    /** Kredi/Banka karti (iyzico) odeme secenegi acik mi. */
    @Column(name = "card_enabled", nullable = false)
    private boolean cardEnabled;

    /** Kapida nakit odeme secenegi acik mi. */
    @Column(name = "cod_enabled", nullable = false)
    private boolean codEnabled;

    /** Kapida odeme icin toplama eklenen ek ucret. */
    @Column(name = "cod_surcharge", nullable = false, precision = 12, scale = 2)
    private BigDecimal codSurcharge;

    /** EFT/Havale odeme secenegi acik mi. */
    @Column(name = "bank_transfer_enabled", nullable = false)
    private boolean bankTransferEnabled;

    @Column(name = "bank_transfer_iban", length = 40)
    private String bankTransferIban;

    @Column(name = "bank_transfer_account_name", length = 150)
    private String bankTransferAccountName;

    @Column(name = "bank_transfer_bank_name", length = 100)
    private String bankTransferBankName;

    /** Anlasmali kargo firmalari; virgulle ayrilmis liste (orn. "PTT Kargo,Yurtici Kargo"). */
    @Column(name = "shipping_carriers", nullable = false, length = 500)
    private String shippingCarriers;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private OffsetDateTime updatedAt;
}
