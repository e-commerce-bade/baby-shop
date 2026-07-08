package com.babyshop.order;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Terk edilmis checkout temizligi: belirli sure odenmeden bekleyen siparisleri iptal eder ve
 * checkout aninda rezerve edilen stogu geri verir; boylece odenmeyen siparisler envanteri
 * suresiz kilitlemez. Stok siparis olusturulurken rezerve edildiginden bu is sarttir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderExpiryService {

    // Odenmeden bekleyen siparisin gecerlilik suresi (dk). Env ile ayarlanabilir.
    @Value("${app.order.pending-expiry-minutes:15}")
    private long expiryMinutes;

    private final OrderRepository orderRepository;
    private final StockReservationService stockReservationService;

    @Scheduled(fixedDelayString = "${app.order.expiry-check-interval-ms:120000}")
    @Transactional
    public void expireStalePendingOrders() {
        OffsetDateTime cutoff = OffsetDateTime.now().minus(expiryMinutes, ChronoUnit.MINUTES);
        List<Order> stale = orderRepository.findAllByStatusAndUpdatedAtBefore(
                OrderStatusPolicy.PENDING_PAYMENT, cutoff);

        for (Order order : stale) {
            stockReservationService.release(order);
            // CANCELLED yerine EXPIRED: odenmeden terk edilen (kart) siparisleri, gercek iptal
            // edilen siparislerle karismasin diye ayri tutulur ve admin listelerinde gosterilmez.
            order.setStatus(OrderStatusPolicy.EXPIRED);
            orderRepository.save(order);
            log.info("Sure asimi: {} dk odenmeden bekleyen siparis {} 'Odenmedi' durumuna alindi, stok iade edildi.",
                    expiryMinutes, order.getOrderNumber());
        }
    }
}
