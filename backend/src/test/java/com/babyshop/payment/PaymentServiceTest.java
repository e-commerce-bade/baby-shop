package com.babyshop.payment;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderRepository;
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
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    private final MockPaymentGateway mockPaymentGateway =
            new MockPaymentGateway(new PaymentProperties(
                    new PaymentProperties.Mock("mock-callback-secret-for-tests")
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

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        var response = paymentService.initiatePayment(request);

        assertThat(response.provider()).isEqualTo("MOCK");
        assertThat(response.status()).isEqualTo("INITIATED");
        assertThat(response.paymentPageUrl()).contains("mock-payments.local/checkout");
    }

    @Test
    void shouldReturnPaymentByTransactionId() {
        Payment payment = buildPayment(buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT"));
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
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

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        assertThatThrownBy(() -> paymentService.initiatePayment(request))
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

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        assertThatThrownBy(() -> paymentService.initiatePayment(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Payment can only be initiated for orders in PENDING_PAYMENT status");
    }

    @Test
    void shouldThrowWhenPaymentMissing() {
        given(paymentRepository.findByTransactionId("TXN-MISSING")).willReturn(Optional.empty());

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        assertThatThrownBy(() -> paymentService.getPaymentByTransactionId("TXN-MISSING"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Payment not found for transaction id: TXN-MISSING");
    }

    @Test
    void shouldConfirmPaymentAndMarkOrderPaid() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        var response = paymentService.confirmPayment("TXN-123");

        assertThat(response.status()).isEqualTo("SUCCEEDED");
        assertThat(order.getStatus()).isEqualTo("PAID");
        assertThat(payment.getPaidAt()).isNotNull();
    }

    @Test
    void shouldTreatDuplicateConfirmAsIdempotent() {
        Order order = buildOrder("ORD-ABC123DEF456", "PAID");
        Payment payment = buildPayment(order);
        payment.setStatus("SUCCEEDED");
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        var response = paymentService.confirmPayment("TXN-123");

        assertThat(response.status()).isEqualTo("SUCCEEDED");
        assertThat(order.getStatus()).isEqualTo("PAID");
    }

    @Test
    void shouldFailPaymentAndCancelOrder() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        var response = paymentService.failPayment("TXN-123");

        assertThat(response.status()).isEqualTo("FAILED");
        assertThat(order.getStatus()).isEqualTo("CANCELLED");
    }

    @Test
    void shouldRejectConfirmingFailedPayment() {
        Order order = buildOrder("ORD-ABC123DEF456", "CANCELLED");
        Payment payment = buildPayment(order);
        payment.setStatus("FAILED");
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
        assertThatThrownBy(() -> paymentService.confirmPayment("TXN-123"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Failed payment cannot be confirmed for transaction id: TXN-123");
    }

    @Test
    void shouldProcessSuccessfulCallback() {
        Order order = buildOrder("ORD-ABC123DEF456", "PENDING_PAYMENT");
        Payment payment = buildPayment(order);
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
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
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
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
        given(paymentRepository.findByProviderReference("MOCK-TXN-123")).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
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
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
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
        given(paymentRepository.findByTransactionId("TXN-123")).willReturn(Optional.of(payment));

        paymentService = new PaymentService(orderRepository, paymentRepository, List.of(mockPaymentGateway));
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
