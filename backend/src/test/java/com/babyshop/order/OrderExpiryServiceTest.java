package com.babyshop.order;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderExpiryServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private StockReservationService stockReservationService;

    @InjectMocks
    private OrderExpiryService orderExpiryService;

    @Test
    void shouldCancelStalePendingOrdersAndReleaseStock() {
        Order order = new Order();
        order.setOrderNumber("ORD-STALE");
        order.setStatus("PENDING_PAYMENT");

        given(orderRepository.findAllByStatusAndUpdatedAtBefore(eq("PENDING_PAYMENT"), any()))
                .willReturn(List.of(order));
        given(orderRepository.save(any(Order.class))).willAnswer(invocation -> invocation.getArgument(0));

        orderExpiryService.expireStalePendingOrders();

        // Sure asimina ugrayan siparis iptal edilir ve rezerve stok geri verilir.
        verify(stockReservationService).release(order);
        assertThat(order.getStatus()).isEqualTo("CANCELLED");
        verify(orderRepository).save(order);
    }
}
