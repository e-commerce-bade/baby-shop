package com.babyshop.payment;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderRepository;
import com.babyshop.payment.dto.PaymentInitiationRequest;
import com.babyshop.payment.dto.PaymentResponse;
import com.babyshop.payment.gateway.PaymentGateway;
import com.babyshop.payment.gateway.PaymentGatewayInitiation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private static final String ORDER_STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    private static final String ORDER_STATUS_PAID = "PAID";
    private static final String ORDER_STATUS_CANCELLED = "CANCELLED";
    private static final String PAYMENT_STATUS_INITIATED = "INITIATED";
    private static final String PAYMENT_STATUS_SUCCEEDED = "SUCCEEDED";
    private static final String PAYMENT_STATUS_FAILED = "FAILED";

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final List<PaymentGateway> paymentGateways;

    @Transactional
    public PaymentResponse initiatePayment(PaymentInitiationRequest request) {
        String orderNumber = request.orderNumber().trim();
        String provider = request.provider().trim().toUpperCase(Locale.ROOT);

        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));

        if (!ORDER_STATUS_PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Payment can only be initiated for orders in PENDING_PAYMENT status");
        }

        PaymentGateway gateway = resolveGateway(provider);
        String transactionId = generateTransactionId();
        PaymentGatewayInitiation initiation = gateway.initiatePayment(
                order,
                transactionId,
                request.successUrl().trim(),
                request.cancelUrl().trim()
        );

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(provider);
        payment.setStatus(PAYMENT_STATUS_INITIATED);
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency(order.getCurrency());
        payment.setTransactionId(transactionId);
        payment.setProviderReference(initiation.providerReference());

        return toResponse(paymentRepository.save(payment), initiation.paymentPageUrl());
    }

    public PaymentResponse getPaymentByTransactionId(String transactionId) {
        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new InvalidRequestException("Payment transaction id is required");
        }

        Payment payment = paymentRepository.findByTransactionId(transactionId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for transaction id: " + transactionId));

        return toResponse(payment, null);
    }

    @Transactional
    public PaymentResponse confirmPayment(String transactionId) {
        Payment payment = findPaymentByTransactionId(transactionId);

        if (PAYMENT_STATUS_SUCCEEDED.equalsIgnoreCase(payment.getStatus())) {
            throw new InvalidRequestException("Payment is already confirmed for transaction id: " + payment.getTransactionId());
        }

        if (PAYMENT_STATUS_FAILED.equalsIgnoreCase(payment.getStatus())) {
            throw new InvalidRequestException("Failed payment cannot be confirmed for transaction id: " + payment.getTransactionId());
        }

        payment.setStatus(PAYMENT_STATUS_SUCCEEDED);
        payment.setPaidAt(java.time.OffsetDateTime.now());
        payment.getOrder().setStatus(ORDER_STATUS_PAID);

        return toResponse(paymentRepository.save(payment), null);
    }

    @Transactional
    public PaymentResponse failPayment(String transactionId) {
        Payment payment = findPaymentByTransactionId(transactionId);

        if (PAYMENT_STATUS_FAILED.equalsIgnoreCase(payment.getStatus())) {
            throw new InvalidRequestException("Payment is already marked as failed for transaction id: " + payment.getTransactionId());
        }

        if (PAYMENT_STATUS_SUCCEEDED.equalsIgnoreCase(payment.getStatus())) {
            throw new InvalidRequestException("Successful payment cannot be marked as failed for transaction id: " + payment.getTransactionId());
        }

        payment.setStatus(PAYMENT_STATUS_FAILED);
        payment.getOrder().setStatus(ORDER_STATUS_CANCELLED);

        return toResponse(paymentRepository.save(payment), null);
    }

    private Payment findPaymentByTransactionId(String transactionId) {
        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new InvalidRequestException("Payment transaction id is required");
        }

        return paymentRepository.findByTransactionId(transactionId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for transaction id: " + transactionId));
    }

    private PaymentGateway resolveGateway(String provider) {
        Map<String, PaymentGateway> gateways = paymentGateways.stream()
                .collect(Collectors.toMap(
                        gateway -> gateway.providerCode().toUpperCase(Locale.ROOT),
                        Function.identity()
                ));

        PaymentGateway gateway = gateways.get(provider);
        if (gateway == null) {
            throw new InvalidRequestException("Unsupported payment provider: " + provider);
        }

        return gateway;
    }

    private String generateTransactionId() {
        return "TXN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
    }

    private PaymentResponse toResponse(Payment payment, String paymentPageUrl) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getOrderNumber(),
                payment.getProvider(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getTransactionId(),
                payment.getProviderReference(),
                paymentPageUrl
        );
    }
}
