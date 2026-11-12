package com.babyshop.order;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Stok rezervasyonu: envanter, odeme aninda degil siparis olusturulurken (checkout) atomik olarak
 * rezerve edilir; boylece son urun icin iki siparis ayni anda olusamaz (oversell onlenir). Rezervasyon
 * siparis iptal edilince / odeme basarisiz olunca / sure asiminda geri verilir; ancak admin stogu
 * rezervasyondan sonra elle ayarladiysa admin'in girdigi deger gecerli kalir.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StockReservationService {

    private final ProductVariantRepository productVariantRepository;

    // Siparis kalemleri icin stogu atomik olarak dusurerek rezerve eder. Yetersiz stokta istisna
    // firlatir; cagiran metot @Transactional oldugundan kismi rezervasyonlar geri alinir.
    public void reserve(Order order) {
        for (OrderItem item : itemsInLockOrder(order)) {
            int updated = productVariantRepository.decrementStockIfAvailable(
                    item.getProductVariantId(), item.getQuantity());
            if (updated == 0) {
                throw new InvalidRequestException(
                        "'" + item.getProductName() + "' için yeterli stok yok.");
            }
        }
        // Yeniden kullanilan siparis ilk rezervasyon anini korur: arada admin stogu ayarladiysa o
        // deger, siparisin onceki rezervasyonunu zaten kapsar; sonraki bir iptal onu ezmemeli.
        if (order.getStockReservedAt() == null) {
            order.setStockReservedAt(OffsetDateTime.now());
        }
    }

    // Rezerve edilen stogu geri verir (admin iptali / basarisiz odeme / sure asimi). Admin stogu bu
    // siparisin rezervasyonundan sonra elle ayarladiysa (orn. "tukendi" diye 0'a cektiyse) o varyanta
    // stok geri eklenmez; aksi halde iptal edilen eski bir siparis urunu yeniden satisa acardi.
    public void release(Order order) {
        OffsetDateTime reservedAt = order.getStockReservedAt() != null
                ? order.getStockReservedAt()
                : order.getCreatedAt();
        for (OrderItem item : itemsInLockOrder(order)) {
            if (reservedAt == null) {
                productVariantRepository.restoreStock(item.getProductVariantId(), item.getQuantity());
                continue;
            }
            int updated = productVariantRepository.restoreStockUnlessAdjustedSince(
                    item.getProductVariantId(), item.getQuantity(), reservedAt);
            if (updated == 0) {
                log.info("Order {}: stock of variant {} not restored ({} pcs); admin adjusted it after the reservation",
                        order.getOrderNumber(), item.getProductVariantId(), item.getQuantity());
            }
        }
    }

    // Yeniden kullanilan bekleyen siparis: kalemler hemen ardindan tekrar rezerve edilecegi icin onceki
    // rezervasyon kosulsuz geri verilir (geri ver + yeniden dus = admin'in degeri degismez).
    public void releaseForReReservation(Order order) {
        for (OrderItem item : itemsInLockOrder(order)) {
            productVariantRepository.restoreStock(item.getProductVariantId(), item.getQuantity());
        }
    }

    // Varyant satirlari hep id sirasiyla guncellenir (admin stok kaydi da ayni sirayla kilitler);
    // boylece ayni varyantlara dokunan iki islem birbirini karsilikli bekleyip kilitlenmez.
    private List<OrderItem> itemsInLockOrder(Order order) {
        return order.getItems().stream()
                .filter(item -> item.getProductVariantId() != null)
                .sorted(Comparator.comparing(OrderItem::getProductVariantId))
                .toList();
    }
}
