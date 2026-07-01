package com.babyshop.order;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private static final long EXPIRY_MINUTES = 30;

    private final OrderRepository orderRepository;
    private final StockReservationService stockReservationService;

    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    @Transactional
    public void expireStalePendingOrders() {
        OffsetDateTime cutoff = OffsetDateTime.now().minus(EXPIRY_MINUTES, ChronoUnit.MINUTES);
        List<Order> stale = orderRepository.findAllByStatusAndUpdatedAtBefore(
                OrderStatusPolicy.PENDING_PAYMENT, cutoff);

        for (Order order : stale) {
            stockReservationService.release(order);
            order.setStatus(OrderStatusPolicy.CANCELLED);
            orderRepository.save(order);
            log.info("Sure asimi: {} dk odenmeden bekleyen siparis {} iptal edildi, stok iade edildi.",
                    EXPIRY_MINUTES, order.getOrderNumber());
        }
    }
}
