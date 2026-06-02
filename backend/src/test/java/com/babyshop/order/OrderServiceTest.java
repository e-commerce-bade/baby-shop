package com.babyshop.order;

import com.babyshop.cart.Cart;
import com.babyshop.cart.CartItem;
import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.cart.CartRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.customer.CustomerAddress;
import com.babyshop.customer.CustomerAddressRepository;
import com.babyshop.order.dto.CreateOrderRequest;
import com.babyshop.order.dto.OrderAddressRequest;
import com.babyshop.order.dto.OrderStatusUpdateRequest;
import com.babyshop.payment.Payment;
import com.babyshop.payment.PaymentRepository;
import com.babyshop.product.Product;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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

    @Mock
    private CustomerAddressRepository customerAddressRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    void shouldReturnAllOrders() {
        Order firstOrder = buildOrder("ORD-NEW");
        Order secondOrder = buildOrder("ORD-OLD");
        given(orderRepository.findAllByOrderByCreatedAtDesc()).willReturn(List.of(firstOrder, secondOrder));
        given(paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc("ORD-NEW")).willReturn(List.of());
        given(paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc("ORD-OLD")).willReturn(List.of());

        var response = orderService.getAllOrders();

        assertThat(response).hasSize(2);
        assertThat(response.getFirst().orderNumber()).isEqualTo("ORD-NEW");
    }

    @Test
    void shouldReturnPagedAdminOrders() {
        Order order = buildOrder("ORD-ABC123DEF456");
        given(orderRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)
        )).willReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 10), 1));
        given(paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc("ORD-ABC123DEF456")).willReturn(List.of());

        var response = orderService.getAllOrders(
                0,
                10,
                null,
                "PAID",
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30")
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.page()).isEqualTo(0);
        assertThat(response.totalElements()).isEqualTo(1);
    }

    @Test
    void shouldReturnPagedAdminOrdersFilteredByOrderNumber() {
        Order order = buildOrder("ORD-ABC123DEF456");
        given(orderRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)
        )).willReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 10), 1));
        given(paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc("ORD-ABC123DEF456")).willReturn(List.of());

        var response = orderService.getAllOrders(
                0,
                10,
                "ABC123",
                null,
                null,
                null
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().orderNumber()).contains("ABC123");
    }

    @Test
    void shouldReturnOrderByOrderNumber() {
        Order order = buildOrder("ORD-ABC123DEF456");
        order.getItems().add(buildOrderItem(order, 1L, 2));
        Payment payment = buildPayment(order);

        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));
        given(paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc("ORD-ABC123DEF456"))
                .willReturn(List.of(payment));

        var response = orderService.getOrderByOrderNumber("ORD-ABC123DEF456");

        assertThat(response.orderNumber()).isEqualTo("ORD-ABC123DEF456");
        assertThat(response.items()).hasSize(1);
        assertThat(response.payment()).isNotNull();
        assertThat(response.payment().status()).isEqualTo("SUCCEEDED");
    }

    @Test
    void shouldReturnPagedOrdersByUserEmail() {
        Order order = buildOrder("ORD-ABC123DEF456");
        given(orderRepository.findAll(
                any(org.springframework.data.jpa.domain.Specification.class),
                any(org.springframework.data.domain.Pageable.class)
        ))
                .willReturn(new PageImpl<>(List.of(order), PageRequest.of(0, 10), 1));
        given(paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc("ORD-ABC123DEF456")).willReturn(List.of());

        var response = orderService.getOrdersByUserEmail(
                "customer@babyshop.local",
                0,
                10,
                "PAID",
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30")
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.page()).isEqualTo(0);
        assertThat(response.totalElements()).isEqualTo(1);
    }

    @Test
    void shouldRejectInvalidPagedOrderDateRange() {
        assertThatThrownBy(() -> orderService.getOrdersByUserEmail(
                "customer@babyshop.local",
                0,
                10,
                null,
                LocalDate.parse("2026-06-30"),
                LocalDate.parse("2026-06-01")
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Order date range is invalid: from must be on or before to");
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
                null,
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
        assertThat(response.createdAt()).isNull();
        assertThat(response.payment()).isNull();
        assertThat(cart.getStatus()).isEqualTo("CHECKED_OUT");
        assertThat(variant.getStockQuantity()).isEqualTo(3);
        verify(productVariantRepository).saveAll(anyList());
    }

    @Test
    void shouldRejectEmptyCart() {
        Cart cart = buildCart("ACTIVE");
        CreateOrderRequest request = new CreateOrderRequest("session-1", "customer@example.com", null, null, null, null, addressRequest(), null);
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

        CreateOrderRequest request = new CreateOrderRequest("session-1", "customer@example.com", null, null, null, null, addressRequest(), null);
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

        CreateOrderRequest request = new CreateOrderRequest("session-1", "customer@example.com", null, null, null, null, addressRequest(), null);
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
                null,
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
    void shouldCreateOrderUsingSavedCustomerAddress() {
        Cart cart = buildCart("ACTIVE");
        ProductVariant variant = buildVariant(10L, 5, true, true, "TRY");
        cart.getItems().add(buildCartItem(cart, variant, 1));

        UserAccount user = new UserAccount();
        user.setId(5L);
        user.setEmail("customer@babyshop.local");

        CustomerAddress address = new CustomerAddress();
        address.setId(20L);
        address.setRecipientFirstName("Ayse");
        address.setRecipientLastName("Demir");
        address.setPhoneNumber("5552223344");
        address.setLine1("Bagdat Cd. No:20");
        address.setLine2("Daire 8");
        address.setDistrict("Kadikoy");
        address.setCity("Istanbul");
        address.setPostalCode("34710");
        address.setCountry("Turkey");

        CreateOrderRequest request = new CreateOrderRequest(
                "session-1",
                "customer@example.com",
                null,
                null,
                null,
                20L,
                null,
                null
        );

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(customerAddressRepository.findByIdAndUserEmailIgnoreCase(20L, "customer@babyshop.local"))
                .willReturn(Optional.of(address));
        given(productVariantRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        given(orderRepository.save(any(Order.class))).willAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });

        var response = orderService.createOrder(request, "customer@babyshop.local");

        assertThat(response.customerFirstName()).isEqualTo("Ayse");
        assertThat(response.customerPhone()).isEqualTo("5552223344");
        assertThat(response.shippingAddress().line1()).isEqualTo("Bagdat Cd. No:20");
    }

    @Test
    void shouldRejectSavedAddressForGuestCheckout() {
        Cart cart = buildCart("ACTIVE");
        ProductVariant variant = buildVariant(10L, 5, true, true, "TRY");
        cart.getItems().add(buildCartItem(cart, variant, 1));

        CreateOrderRequest request = new CreateOrderRequest(
                "session-1",
                "customer@example.com",
                null,
                null,
                null,
                20L,
                null,
                null
        );

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));

        assertThatThrownBy(() -> orderService.createOrder(request, null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Authenticated user is required when shippingAddressId is used");
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
        order.setStatus("PREPARING");
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

    @Test
    void shouldRejectInvalidOrderStatusTransition() {
        Order order = buildOrder("ORD-ABC123DEF456");
        order.setStatus("PAID");
        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(
                "ORD-ABC123DEF456",
                new OrderStatusUpdateRequest("DELIVERED")
        ))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Invalid order status transition: PAID -> DELIVERED");
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
        order.setCreatedAt(OffsetDateTime.parse("2026-06-01T12:00:00+03:00"));
        order.setItems(new ArrayList<>());
        return order;
    }

    private Payment buildPayment(Order order) {
        Payment payment = new Payment();
        payment.setId(3L);
        payment.setOrder(order);
        payment.setProvider("MOCK");
        payment.setStatus("SUCCEEDED");
        payment.setAmount(new BigDecimal("998.00"));
        payment.setCurrency("TRY");
        payment.setTransactionId("txn-123");
        payment.setProviderReference("mock-ref-123");
        payment.setPaidAt(OffsetDateTime.parse("2026-06-01T12:05:00+03:00"));
        return payment;
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
