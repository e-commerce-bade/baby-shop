package com.babyshop.order;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Stok rezervasyonu: envanter, odeme aninda degil siparis olusturulurken (checkout) atomik olarak
 * rezerve edilir; boylece son urun icin iki siparis ayni anda olusamaz (oversell onlenir). Rezervasyon
 * yalnizca siparis CANCELLED'a gecince geri verilir (basarisiz odeme / admin iptali / sure asimi).
 */
@Service
@RequiredArgsConstructor
public class StockReservationService {

    private final ProductVariantRepository productVariantRepository;

    // Siparis kalemleri icin stogu atomik olarak dusurerek rezerve eder. Yetersiz stokta istisna
    // firlatir; cagiran metot @Transactional oldugundan kismi rezervasyonlar geri alinir.
    public void reserve(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProductVariantId() == null) {
                continue;
            }
            int updated = productVariantRepository.decrementStockIfAvailable(
                    item.getProductVariantId(), item.getQuantity());
            if (updated == 0) {
                throw new InvalidRequestException(
                        "'" + item.getProductName() + "' için yeterli stok yok.");
            }
        }
    }

    // Rezerve edilen stogu geri verir (iptal / basarisiz odeme / sure asimi).
    public void release(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProductVariantId() == null) {
                continue;
            }
            productVariantRepository.restoreStock(item.getProductVariantId(), item.getQuantity());
        }
    }
}
