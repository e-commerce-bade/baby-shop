package com.babyshop.order;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.product.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class StockReservationServiceTest {

    @Mock
    private ProductVariantRepository productVariantRepository;

    @InjectMocks
    private StockReservationService stockReservationService;

    @Test
    void reserveShouldDecrementStockAndRecordReservationTime() {
        Order order = orderWithItems(new long[]{10L}, new int[]{2});
        given(productVariantRepository.decrementStockIfAvailable(10L, 2)).willReturn(1);

        stockReservationService.reserve(order);

        assertThat(order.getStockReservedAt()).isNotNull();
    }

    @Test
    void reserveShouldKeepTheFirstReservationTimeOfAReusedOrder() {
        OffsetDateTime firstReservation = OffsetDateTime.parse("2026-11-12T10:00:00Z");
        Order order = orderWithItems(new long[]{10L}, new int[]{1});
        order.setStockReservedAt(firstReservation);
        given(productVariantRepository.decrementStockIfAvailable(10L, 1)).willReturn(1);

        stockReservationService.reserve(order);

        assertThat(order.getStockReservedAt()).isEqualTo(firstReservation);
    }

    @Test
    void reserveShouldRejectWhenStockInsufficient() {
        Order order = orderWithItems(new long[]{10L}, new int[]{2});
        given(productVariantRepository.decrementStockIfAvailable(10L, 2)).willReturn(0);

        assertThatThrownBy(() -> stockReservationService.reserve(order))
                .isInstanceOf(InvalidRequestException.class);
        assertThat(order.getStockReservedAt()).isNull();
    }

    @Test
    void releaseShouldOnlyRestoreVariantsNotAdjustedSinceReservation() {
        OffsetDateTime reservedAt = OffsetDateTime.parse("2026-11-12T10:00:00Z");
        Order order = orderWithItems(new long[]{20L, 10L}, new int[]{3, 1});
        order.setStockReservedAt(reservedAt);
        order.setCreatedAt(reservedAt.minusHours(1));

        stockReservationService.release(order);

        // Kosul (admin duzeltmesi rezervasyondan sonra mi?) veritabani sorgusunda; rezervasyon ani
        // iletilir. Kilit sirasi korunur: once kucuk id.
        InOrder inOrder = inOrder(productVariantRepository);
        inOrder.verify(productVariantRepository).restoreStockUnlessAdjustedSince(10L, 1, reservedAt);
        inOrder.verify(productVariantRepository).restoreStockUnlessAdjustedSince(20L, 3, reservedAt);
        verify(productVariantRepository, never()).restoreStock(anyLong(), anyInt());
    }

    @Test
    void releaseShouldFallBackToCreatedAtForOrdersReservedBeforeTracking() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-11-01T08:00:00Z");
        Order order = orderWithItems(new long[]{10L}, new int[]{3});
        order.setCreatedAt(createdAt);

        stockReservationService.release(order);

        verify(productVariantRepository).restoreStockUnlessAdjustedSince(10L, 3, createdAt);
    }

    @Test
    void releaseForReReservationShouldRestoreUnconditionally() {
        Order order = orderWithItems(new long[]{10L}, new int[]{2});
        order.setStockReservedAt(OffsetDateTime.parse("2026-11-12T10:00:00Z"));

        stockReservationService.releaseForReReservation(order);

        verify(productVariantRepository).restoreStock(10L, 2);
        verify(productVariantRepository, never()).restoreStockUnlessAdjustedSince(anyLong(), anyInt(), any());
    }

    private Order orderWithItems(long[] variantIds, int[] quantities) {
        Order order = new Order();
        order.setOrderNumber("ORD-TEST");
        for (int i = 0; i < variantIds.length; i++) {
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProductVariantId(variantIds[i]);
            item.setProductName("Test Urun");
            item.setQuantity(quantities[i]);
            order.getItems().add(item);
        }
        return order;
    }
}
