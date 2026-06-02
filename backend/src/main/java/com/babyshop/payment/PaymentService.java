package com.babyshop.payment;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderStatusPolicy;
import com.babyshop.order.OrderRepository;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.payment.dto.PaymentCallbackResponse;
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
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

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

        if (!OrderStatusPolicy.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
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
            return toResponse(payment, null);
        }

        if (PAYMENT_STATUS_FAILED.equalsIgnoreCase(payment.getStatus())) {
            throw new InvalidRequestException("Failed payment cannot be confirmed for transaction id: " + payment.getTransactionId());
        }

        return toResponse(completePaymentAsSucceeded(payment), null);
    }

    @Transactional
    public PaymentResponse failPayment(String transactionId) {
        Payment payment = findPaymentByTransactionId(transactionId);

        if (PAYMENT_STATUS_FAILED.equalsIgnoreCase(payment.getStatus())) {
            return toResponse(payment, null);
        }

        if (PAYMENT_STATUS_SUCCEEDED.equalsIgnoreCase(payment.getStatus())) {
            throw new InvalidRequestException("Successful payment cannot be marked as failed for transaction id: " + payment.getTransactionId());
        }

        return toResponse(completePaymentAsFailed(payment), null);
    }

    @Transactional
    public PaymentCallbackResponse processCallback(String provider, PaymentCallbackRequest request) {
        String normalizedProvider = normalizeRequiredProvider(provider);
        String normalizedCallbackStatus = normalizeRequiredCallbackStatus(request.status());
        Payment payment = findPaymentByTransactionOrReference(request.transactionId(), request.providerReference());

        if (!payment.getProvider().equalsIgnoreCase(normalizedProvider)) {
            throw new InvalidRequestException("Payment provider mismatch for transaction id: " + payment.getTransactionId());
        }

        PaymentGateway gateway = resolveGateway(normalizedProvider);
        gateway.verifyCallback(request, payment);

        if (PAYMENT_STATUS_SUCCEEDED.equalsIgnoreCase(payment.getStatus())) {
            if (PAYMENT_STATUS_SUCCEEDED.equals(normalizedCallbackStatus)) {
                return toCallbackResponse(payment, true);
            }
            throw new InvalidRequestException(
                    "Successful payment cannot be marked as failed for transaction id: " + payment.getTransactionId()
            );
        }

        if (PAYMENT_STATUS_FAILED.equalsIgnoreCase(payment.getStatus())) {
            if (PAYMENT_STATUS_FAILED.equals(normalizedCallbackStatus)) {
                return toCallbackResponse(payment, true);
            }
            throw new InvalidRequestException(
                    "Failed payment cannot be confirmed for transaction id: " + payment.getTransactionId()
            );
        }

        Payment updatedPayment = PAYMENT_STATUS_SUCCEEDED.equals(normalizedCallbackStatus)
                ? completePaymentAsSucceeded(payment)
                : completePaymentAsFailed(payment);

        return toCallbackResponse(updatedPayment, false);
    }

    private Payment findPaymentByTransactionId(String transactionId) {
        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new InvalidRequestException("Payment transaction id is required");
        }

        return paymentRepository.findByTransactionId(transactionId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for transaction id: " + transactionId));
    }

    private Payment findPaymentByTransactionOrReference(String transactionId, String providerReference) {
        String normalizedTransactionId = normalizeOptional(transactionId);
        String normalizedProviderReference = normalizeOptional(providerReference);

        if (normalizedTransactionId == null && normalizedProviderReference == null) {
            throw new InvalidRequestException("Payment callback requires transactionId or providerReference");
        }

        Optional<Payment> payment = normalizedTransactionId == null
                ? Optional.empty()
                : paymentRepository.findByTransactionId(normalizedTransactionId);

        if (payment.isPresent()) {
            return payment.get();
        }

        return paymentRepository.findByProviderReference(normalizedProviderReference)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for callback identifiers"));
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

    private Payment completePaymentAsSucceeded(Payment payment) {
        OrderStatusPolicy.validateTransition(payment.getOrder().getStatus(), OrderStatusPolicy.PAID);
        payment.setStatus(PAYMENT_STATUS_SUCCEEDED);
        payment.setPaidAt(java.time.OffsetDateTime.now());
        payment.getOrder().setStatus(OrderStatusPolicy.PAID);
        return paymentRepository.save(payment);
    }

    private Payment completePaymentAsFailed(Payment payment) {
        OrderStatusPolicy.validateTransition(payment.getOrder().getStatus(), OrderStatusPolicy.CANCELLED);
        payment.setStatus(PAYMENT_STATUS_FAILED);
        payment.getOrder().setStatus(OrderStatusPolicy.CANCELLED);
        return paymentRepository.save(payment);
    }

    private PaymentCallbackResponse toCallbackResponse(Payment payment, boolean duplicate) {
        return new PaymentCallbackResponse(
                payment.getProvider(),
                payment.getTransactionId(),
                payment.getStatus(),
                payment.getOrder().getOrderNumber(),
                payment.getOrder().getStatus(),
                duplicate
        );
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

    private String normalizeRequiredProvider(String provider) {
        if (provider == null || provider.trim().isEmpty()) {
            throw new InvalidRequestException("Payment provider is required");
        }

        return provider.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeRequiredCallbackStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new InvalidRequestException("Payment callback status is required");
        }

        String normalizedStatus = status.trim().toUpperCase(Locale.ROOT);
        if (!PAYMENT_STATUS_SUCCEEDED.equals(normalizedStatus) && !PAYMENT_STATUS_FAILED.equals(normalizedStatus)) {
            throw new InvalidRequestException("Unsupported payment callback status: " + normalizedStatus);
        }

        return normalizedStatus;
    }

    private String normalizeOptional(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}
