package com.babyshop.notification;

import com.babyshop.order.Order;
import com.babyshop.order.OrderItem;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class OrderEmailServiceTest {

    @Mock
    private AsyncMailDispatcher dispatcher;

    @Test
    void shouldDispatchConfirmationWhenEnabled() {
        var properties = new MailProperties(true, "Bade Bebe <shop@example.com>", "Bade Bebe", "https://shop.test");
        var service = new OrderEmailService(properties, dispatcher);

        service.sendOrderConfirmation(buildOrder());

        // Konu ve govde siparis numarasini icermeli; gonderen ve alici dogru gecmeli.
        verify(dispatcher).dispatchHtml(
                eq("Bade Bebe <shop@example.com>"),
                eq("customer@example.com"),
                contains("ORD-1"),
                contains("ORD-1")
        );
    }

    @Test
    void shouldNotDispatchWhenDisabled() {
        var properties = new MailProperties(false, "shop@example.com", "Bade Bebe", "https://shop.test");
        var service = new OrderEmailService(properties, dispatcher);

        service.sendOrderConfirmation(buildOrder());

        verifyNoInteractions(dispatcher);
    }

    @Test
    void shouldNotDispatchWhenCustomerEmailMissing() {
        var properties = new MailProperties(true, "shop@example.com", "Bade Bebe", "https://shop.test");
        var service = new OrderEmailService(properties, dispatcher);
        Order order = buildOrder();
        order.setCustomerEmail(null);

        service.sendOrderConfirmation(order);

        verifyNoInteractions(dispatcher);
    }

    private Order buildOrder() {
        Order order = new Order();
        order.setOrderNumber("ORD-1");
        order.setCustomerEmail("customer@example.com");
        order.setCustomerFirstName("Ada");
        order.setCustomerLastName("Yilmaz");
        order.setCurrency("TRY");
        order.setSubtotalAmount(new BigDecimal("100.00"));
        order.setShippingAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setShippingAddressLine1("Test Mah. 1");
        order.setShippingCity("Istanbul");
        order.setShippingCountry("Turkiye");

        OrderItem item = new OrderItem();
        item.setProductName("Pijama");
        item.setVariantLabel("Standart / Pembe");
        item.setQuantity(1);
        item.setLineTotal(new BigDecimal("100.00"));
        item.setCurrency("TRY");
        order.setItems(new ArrayList<>(List.of(item)));
        return order;
    }
}
