package com.babyshop.common.exception;

import java.util.List;

/**
 * Yonetim panelinden gelen bir stok degisikligi, panelin gordugu stok ile veritabanindaki stok
 * farkli oldugu icin reddedildi (arada bir siparis stogu dusurmus ya da iptal geri vermis olabilir).
 * Yanit, panelin guncel degerleri gosterebilmesi icin her varyantin simdiki stogunu da tasir.
 */
public class StockConflictException extends RuntimeException {

    private final transient List<StockConflict> conflicts;

    public StockConflictException(String message, List<StockConflict> conflicts) {
        super(message);
        this.conflicts = List.copyOf(conflicts);
    }

    public List<StockConflict> getConflicts() {
        return conflicts;
    }

    public record StockConflict(Long variantId, int expectedStockQuantity, int currentStockQuantity) {
    }
}
