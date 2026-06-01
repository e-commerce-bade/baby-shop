package com.babyshop.order;

import com.babyshop.cart.Cart;
import com.babyshop.cart.CartItem;
import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.cart.CartRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.dto.CreateOrderRequest;
import com.babyshop.order.dto.OrderAddressRequest;
import com.babyshop.order.dto.OrderStatusUpdateRequest;
import com.babyshop.product.Product;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    void shouldReturnAllOrders() {
        Order firstOrder = buildOrder("ORD-NEW");
        Order secondOrder = buildOrder("ORD-OLD");
        given(orderRepository.findAllByOrderByCreatedAtDesc()).willReturn(List.of(firstOrder, secondOrder));

        var response = orderService.getAllOrders();

        assertThat(response).hasSize(2);
        assertThat(response.getFirst().orderNumber()).isEqualTo("ORD-NEW");
    }

    @Test
    void shouldReturnOrderByOrderNumber() {
        Order order = buildOrder("ORD-ABC123DEF456");
        order.getItems().add(buildOrderItem(order, 1L, 2));

        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));

        var response = orderService.getOrderByOrderNumber("ORD-ABC123DEF456");

        assertThat(response.orderNumber()).isEqualTo("ORD-ABC123DEF456");
        assertThat(response.items()).hasSize(1);
    }

    @Test
    void shouldCreateOrderFromActiveCart() {
        Cart cart = buildCart("ACTIVE");
        ProductVariant variant = buildVariant(10L, 5, true, true, "TRY");
        CartItem item = buildCartItem(cart, variant, 2);
        cart.getItems().add(item);

        CreateOrderRequest request = new CreateOrderRequest(
                "session-1",
                "customer@example.com",
                "Ceren",
                "Yilmaz",
                "5551112233",
                addressRequest(),
                "Leave at the door"
        );

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(productVariantRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        given(orderRepository.save(any(Order.class))).willAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            long itemId = 1L;
            for (OrderItem orderItem : order.getItems()) {
                orderItem.setId(itemId++);
            }
            return order;
        });

        var response = orderService.createOrder(request, null);

        assertThat(response.status()).isEqualTo("PENDING_PAYMENT");
        assertThat(response.totalAmount()).isEqualByComparingTo("998.00");
        assertThat(cart.getStatus()).isEqualTo("CHECKED_OUT");
        assertThat(variant.getStockQuantity()).isEqualTo(3);
        verify(productVariantRepository).saveAll(anyList());
    }

    @Test
    void shouldRejectEmptyCart() {
        Cart cart = buildCart("ACTIVE");
        CreateOrderRequest request = new CreateOrderRequest("session-1", "customer@example.com", null, null, null, addressRequest(), null);
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));

        assertThatThrownBy(() -> orderService.createOrder(request, null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Cart is empty for session id: session-1");
    }

    @Test
    void shouldRejectInactiveCartStatus() {
        Cart cart = buildCart("CHECKED_OUT");
        ProductVariant variant = buildVariant(10L, 5, true, true, "TRY");
        cart.getItems().add(buildCartItem(cart, variant, 1));

        CreateOrderRequest request = new CreateOrderRequest("session-1", "customer@example.com", null, null, null, addressRequest(), null);
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));

        assertThatThrownBy(() -> orderService.createOrder(request, null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Cart is not active for checkout. Current status: CHECKED_OUT");
    }

    @Test
    void shouldRejectMixedCurrencies() {
        Cart cart = buildCart("ACTIVE");
        cart.getItems().add(buildCartItem(cart, buildVariant(10L, 5, true, true, "TRY"), 1));
        cart.getItems().add(buildCartItem(cart, buildVariant(11L, 5, true, true, "USD"), 1));

        CreateOrderRequest request = new CreateOrderRequest("session-1", "customer@example.com", null, null, null, addressRequest(), null);
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));

        assertThatThrownBy(() -> orderService.createOrder(request, null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Cart contains items with different currencies");
    }

    @Test
    void shouldAttachAuthenticatedUserToOrder() {
        Cart cart = buildCart("ACTIVE");
        ProductVariant variant = buildVariant(10L, 5, true, true, "TRY");
        CartItem item = buildCartItem(cart, variant, 1);
        cart.getItems().add(item);
        UserAccount user = new UserAccount();
        user.setId(5L);
        user.setEmail("customer@babyshop.local");

        CreateOrderRequest request = new CreateOrderRequest(
                "session-1",
                "customer@example.com",
                "Ceren",
                "Yilmaz",
                "5551112233",
                addressRequest(),
                null
        );

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(productVariantRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        given(orderRepository.save(any(Order.class))).willAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });

        orderService.createOrder(request, "customer@babyshop.local");

        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void shouldThrowWhenOrderMissing() {
        given(orderRepository.findByOrderNumber("ORD-MISSING")).willReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.getOrderByOrderNumber("ORD-MISSING"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Order not found for order number: ORD-MISSING");
    }

    @Test
    void shouldUpdateOrderStatus() {
        Order order = buildOrder("ORD-ABC123DEF456");
        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));
        given(orderRepository.save(any(Order.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = orderService.updateOrderStatus(
                "ORD-ABC123DEF456",
                new OrderStatusUpdateRequest("shipped")
        );

        assertThat(response.status()).isEqualTo("SHIPPED");
        assertThat(order.getStatus()).isEqualTo("SHIPPED");
    }

    @Test
    void shouldRejectUnsupportedOrderStatus() {
        assertThatThrownBy(() -> orderService.updateOrderStatus(
                "ORD-ABC123DEF456",
                new OrderStatusUpdateRequest("unknown")
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Unsupported order status: UNKNOWN");
    }

    private Cart buildCart(String status) {
        Cart cart = new Cart();
        cart.setId(1L);
        cart.setSessionId("session-1");
        cart.setStatus(status);
        cart.setItems(new ArrayList<>());
        return cart;
    }

    private CartItem buildCartItem(Cart cart, ProductVariant variant, int quantity) {
        CartItem item = new CartItem();
        item.setId(5L);
        item.setCart(cart);
        item.setProductVariant(variant);
        item.setQuantity(quantity);
        return item;
    }

    private ProductVariant buildVariant(Long id, int stockQuantity, boolean active, boolean productActive, String currency) {
        Product product = new Product();
        product.setId(1L);
        product.setName("Baby Dress");
        product.setSlug("baby-dress");
        product.setActive(productActive);
        product.setImages(new ArrayList<>());

        ProductVariant variant = new ProductVariant();
        variant.setId(id);
        variant.setProduct(product);
        variant.setSku("SKU-" + id);
        variant.setSizeLabel("6-9 months");
        variant.setColorName("Pink");
        variant.setStockQuantity(stockQuantity);
        variant.setPrice(new BigDecimal("499.00"));
        variant.setCurrency(currency);
        variant.setActive(active);
        return variant;
    }

    private Order buildOrder(String orderNumber) {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber(orderNumber);
        order.setStatus("PENDING_PAYMENT");
        order.setCustomerEmail("customer@example.com");
        order.setCustomerFirstName("Ceren");
        order.setCustomerLastName("Yilmaz");
        order.setCustomerPhone("5551112233");
        order.setSubtotalAmount(new BigDecimal("998.00"));
        order.setShippingAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("998.00"));
        order.setCurrency("TRY");
        order.setShippingAddressLine1("Ataturk Cd. No:10");
        order.setShippingAddressLine2("Daire 5");
        order.setShippingDistrict("Kadikoy");
        order.setShippingCity("Istanbul");
        order.setShippingPostalCode("34710");
        order.setShippingCountry("Turkey");
        order.setNotes("Leave at the door");
        order.setItems(new ArrayList<>());
        return order;
    }

    private OrderAddressRequest addressRequest() {
        return new OrderAddressRequest(
                "Ataturk Cd. No:10",
                "Daire 5",
                "Kadikoy",
                "Istanbul",
                "34710",
                "Turkey"
        );
    }

    private OrderItem buildOrderItem(Order order, Long id, int quantity) {
        OrderItem item = new OrderItem();
        item.setId(id);
        item.setOrder(order);
        item.setProductId(1L);
        item.setProductVariantId(10L);
        item.setProductName("Baby Dress");
        item.setVariantLabel("6-9 months / Pink");
        item.setSku("SKU-10");
        item.setQuantity(quantity);
        item.setUnitPrice(new BigDecimal("499.00"));
        item.setLineTotal(new BigDecimal("998.00"));
        item.setCurrency("TRY");
        return item;
    }
}
