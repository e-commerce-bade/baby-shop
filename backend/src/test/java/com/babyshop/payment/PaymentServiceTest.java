package com.babyshop.payment;

import com.babyshop.cart.Cart;
import com.babyshop.cart.CartRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderItem;
import com.babyshop.order.OrderRepository;
import com.babyshop.product.ProductVariantRepository;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.payment.dto.PaymentInitiationRequest;
import com.babyshop.payment.gateway.MockPaymentGateway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private CartRepository cartRepository;

    @InjectMocks
    private PaymentService paymentService;

    private final MockPaymentGateway mockPaymentGateway =
            new MockPaymentGateway(new PaymentProperties(
                    new PaymentProperties.Mock("mock-callback-secret-for-tests"),
                    null
            ));

    @Test
    void shouldInitiateMockPayment() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        PaymentInitiationRequest request = new PaymentInitiationRequest(
                "ORD-ABC123DEF456",
                "MOCK",
                "http://localhost:3000/payment/success",
                "http://localhost:3000/payment/cancel"
        );

        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            payment.setId(1L);
            return payment;
        });

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        var response = paymentService.initiatePayment(request, "203.0.113.5");

        assertThat(response.provider()).isEqualTo("MOCK");
        assertThat(response.status()).isEqualTo("INITIATED");
        assertThat(response.paymentPageUrl()).contains("mock-payments.local/checkout");
    }

    @Test
    void shouldReturnPaymentByTransactionId() {
        Payment payment = buildPayment(buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT"));
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        var response = paymentService.getPaymentByTransactionId("TXN-123");

        assertThat(response.transactionId()).isEqualTo("TXN-123");
        assertThat(response.orderNumber()).isEqualTo("ORD-ABC123DEF456");
    }

    @Test
    void shouldRejectUnsupportedProvider() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        PaymentInitiationRequest request = new PaymentInitiationRequest(
                "ORD-ABC123DEF456",
                "PAYTR",
                "http://localhost:3000/payment/success",
                "http://localhost:3000/payment/cancel"
        );

        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        assertThatThrownBy(() -> paymentService.initiatePayment(request, "203.0.113.5"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Unsupported payment provider: PAYTR");
    }

    @Test
    void shouldRejectPaymentForNonPendingOrder() {
        Order order = buildOrder("ORD-ABC123DEF456", "PAID");
        PaymentInitiationRequest request = new PaymentInitiationRequest(
                "ORD-ABC123DEF456",
                "MOCK",
                "http://localhost:3000/payment/success",
                "http://localhost:3000/payment/cancel"
        );

        given(orderRepository.findByOrderNumber("ORD-ABC123DEF456")).willReturn(Optional.of(order));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        assertThatThrownBy(() -> paymentService.initiatePayment(request, "203.0.113.5"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Payment can only be initiated for orders in PENDING_PAYMENT status");
    }

    @Test
    void shouldThrowWhenPaymentMissing() {
        given(paymentRepository.findByTransactionId("TXN-MISSING")).willReturn(Optional.empty());

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        assertThatThrownBy(() -> paymentService.getPaymentByTransactionId("TXN-MISSING"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Payment not found for transaction id: TXN-MISSING");
    }

    @Test
    void shouldDecrementStockWhenPaymentSucceeds() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        OrderItem item = new OrderItem();
        item.setProductVariantId(10L);
        item.setQuantity(2);
        order.getItems().add(item);
        Payment payment = buildPayment(order);

        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(productVariantRepository.decrementStockIfAvailable(10L, 2)).willReturn(1);

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "SUCCEEDED"),
                null
        ));

        assertThat(order.getStatus()).isEqualTo("PAID");
        verify(productVariantRepository).decrementStockIfAvailable(10L, 2);
        verify(productVariantRepository, never()).clampStockToZero(anyLong());
    }

    @Test
    void shouldReleaseCartSessionWhenPaymentSucceeds() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        order.setCartId(5L);
        Payment payment = buildPayment(order);

        Cart cart = new Cart();
        cart.setId(5L);
        cart.setStatus("ACTIVE");
        cart.setSessionId("session-abc");

        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(cartRepository.findById(5L)).willReturn(Optional.of(cart));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "SUCCEEDED"),
                null
        ));

        assertThat(cart.getStatus()).isEqualTo("CHECKED_OUT");
        // sessionId serbest birakilmali ki ayni oturum sonraki istekte taze/bos sepet alsin.
        assertThat(cart.getSessionId()).isNull();
        verify(cartRepository).save(cart);
    }

    @Test
    void shouldClampStockAndWarnWhenInsufficientOnPayment() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        OrderItem item = new OrderItem();
        item.setProductVariantId(10L);
        item.setQuantity(2);
        order.getItems().add(item);
        Payment payment = buildPayment(order);

        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(productVariantRepository.decrementStockIfAvailable(10L, 2)).willReturn(0);

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "SUCCEEDED"),
                null
        ));

        assertThat(order.getStatus()).isEqualTo("PAID");
        verify(productVariantRepository).clampStockToZero(10L);
    }

    @Test
    void shouldProcessSuccessfulCallback() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        var response = paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "SUCCEEDED"),
                "{\"status\":\"SUCCEEDED\"}"
        ));

        assertThat(response.paymentStatus()).isEqualTo("SUCCEEDED");
        assertThat(response.orderStatus()).isEqualTo("PAID");
        assertThat(response.duplicate()).isFalse();
    }

    @Test
    void shouldTreatDuplicateSuccessfulCallbackAsIdempotent() {
        Order order = buildOrder("ORD-ABC123DEF456", "PAID");
        Payment payment = buildPayment(order);
        payment.setStatus("SUCCEEDED");
        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        var response = paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "SUCCEEDED"),
                null
        ));

        assertThat(response.duplicate()).isTrue();
        assertThat(response.paymentStatus()).isEqualTo("SUCCEEDED");
    }

    @Test
    void shouldResolveCallbackByProviderReference() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByProviderReferenceForUpdate("MOCK-TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        var response = paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                null,
                "MOCK-TXN-123",
                "FAILED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "FAILED"),
                null
        ));

        assertThat(response.paymentStatus()).isEqualTo("FAILED");
        assertThat(response.orderStatus()).isEqualTo("CANCELLED");
    }

    @Test
    void shouldRejectCallbackWithProviderMismatch() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        assertThatThrownBy(() -> paymentService.processCallback("PAYTR", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                mockPaymentGateway.generateSignature("TXN-123", "MOCK-TXN-123", "SUCCEEDED"),
                null
        )))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Payment provider mismatch for transaction id: TXN-123");
    }

    @Test
    void shouldRejectCallbackWithInvalidSignature() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByTransactionIdForUpdate("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway), productVariantRepository, cartRepository);
        assertThatThrownBy(() -> paymentService.processCallback("MOCK", new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                "bad-signature",
                null
        )))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Invalid payment callback signature for provider MOCK");
    }

    private Order buildOrder(String orderNumber, String status) {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber(orderNumber);
        order.setStatus(status);
        order.setCustomerEmail("customer@example.com");
        order.setSubtotalAmount(new BigDecimal("998.00"));
        order.setShippingAmount(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("998.00"));
        order.setCurrency("TRY");
        return order;
    }

    private Payment buildPayment(Order order) {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setOrder(order);
        payment.setProvider("MOCK");
        payment.setStatus("INITIATED");
        payment.setAmount(new BigDecimal("998.00"));
        payment.setCurrency("TRY");
        payment.setTransactionId("TXN-123");
        payment.setProviderReference("MOCK-TXN-123");
        payment.setStatus("INITIATED");
        return payment;
    }
}
