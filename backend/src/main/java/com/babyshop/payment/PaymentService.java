package com.babyshop.payment;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.Order;
import com.babyshop.order.OrderStatusPolicy;
import com.babyshop.order.OrderRepository;
import com.babyshop.product.ProductVariantRepository;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.payment.dto.PaymentCallbackResponse;
import com.babyshop.payment.dto.PaymentInitiationRequest;
import com.babyshop.payment.dto.PaymentResponse;
import com.babyshop.cart.CartRepository;
import com.babyshop.notification.OrderEmailService;
import com.babyshop.payment.gateway.PaymentGateway;
import com.babyshop.payment.gateway.PaymentGatewayCallbackResult;
import com.babyshop.payment.gateway.PaymentGatewayInitiation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
@Slf4j
public class PaymentService {

    private static final String PAYMENT_STATUS_INITIATED = "INITIATED";
    private static final String PAYMENT_STATUS_SUCCEEDED = "SUCCEEDED";
    private static final String PAYMENT_STATUS_FAILED = "FAILED";
    private static final String CART_STATUS_CHECKED_OUT = "CHECKED_OUT";

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final List<PaymentGateway> paymentGateways;
    private final ProductVariantRepository productVariantRepository;
    private final CartRepository cartRepository;

    // Non-final + opsiyonel enjeksiyon: @RequiredArgsConstructor'a girmez, boylece testlerdeki
    // manuel `new PaymentService(...)` cagrilari degismeden derlenir; runtime'da Spring enjekte eder.
    @Autowired(required = false)
    private OrderEmailService orderEmailService;

    @Autowired(required = false)
    private PaymentProperties paymentProperties;

    @Autowired(required = false)
    private com.babyshop.order.StockReservationService stockReservationService;

    @Transactional
    public PaymentResponse initiatePayment(PaymentInitiationRequest request, String clientIp) {
        String orderNumber = request.orderNumber().trim();
        String provider = request.provider().trim().toUpperCase(Locale.ROOT);

        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));

        if (!OrderStatusPolicy.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Payment can only be initiated for orders in PENDING_PAYMENT status");
        }

        String successUrl = validateRedirectUrl(request.successUrl(), "successUrl");
        String cancelUrl = validateRedirectUrl(request.cancelUrl(), "cancelUrl");

        PaymentGateway gateway = resolveGateway(provider);
        String transactionId = generateTransactionId();
        PaymentGatewayInitiation initiation = gateway.initiatePayment(
                order,
                transactionId,
                successUrl,
                cancelUrl,
                normalizeOptional(clientIp)
        );

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(provider);
        payment.setStatus(PAYMENT_STATUS_INITIATED);
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency(order.getCurrency());
        payment.setTransactionId(transactionId);
        payment.setProviderReference(initiation.providerReference());
        payment.setSuccessUrl(request.successUrl().trim());
        payment.setCancelUrl(request.cancelUrl().trim());

        return toResponse(paymentRepository.save(payment), initiation.paymentPageUrl(), initiation.checkoutFormContent());
    }

    // Odeme sonrasi yonlendirme URL'ini izinli origin listesine gore dogrular; boylece acik
    // yonlendirme (open redirect) engellenir. Liste bos/yapilandirilmamissa dogrulama atlanir.
    private String validateRedirectUrl(String url, String field) {
        if (url == null || url.trim().isEmpty()) {
            throw new InvalidRequestException(field + " is required");
        }
        String trimmed = url.trim();

        List<String> allowed = allowedRedirectOrigins();
        if (allowed.isEmpty()) {
            return trimmed;
        }

        String origin;
        try {
            origin = originOf(java.net.URI.create(trimmed));
        } catch (IllegalArgumentException ex) {
            throw new InvalidRequestException(field + " is not a valid URL");
        }
        if (origin == null || allowed.stream().noneMatch(origin::equalsIgnoreCase)) {
            throw new InvalidRequestException(field + " is not an allowed redirect target");
        }
        return trimmed;
    }

    private List<String> allowedRedirectOrigins() {
        if (paymentProperties == null || paymentProperties.allowedRedirectOrigins() == null) {
            return List.of();
        }
        return paymentProperties.allowedRedirectOrigins().stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> {
                    try {
                        String normalized = originOf(java.net.URI.create(value.trim()));
                        return normalized != null ? normalized : value.trim();
                    } catch (IllegalArgumentException ex) {
                        return value.trim();
                    }
                })
                .toList();
    }

    private String originOf(java.net.URI uri) {
        if (uri.getScheme() == null || uri.getHost() == null) {
            return null;
        }
        String origin = uri.getScheme().toLowerCase(Locale.ROOT) + "://" + uri.getHost().toLowerCase(Locale.ROOT);
        if (uri.getPort() != -1) {
            origin += ":" + uri.getPort();
        }
        return origin;
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
    public PaymentCallbackResponse processCallback(String provider, PaymentCallbackRequest request) {
        String normalizedProvider = normalizeRequiredProvider(provider);
        Payment payment = findPaymentByTransactionOrReference(request.transactionId(), request.providerReference());

        if (!payment.getProvider().equalsIgnoreCase(normalizedProvider)) {
            throw new InvalidRequestException("Payment provider mismatch for transaction id: " + payment.getTransactionId());
        }

        PaymentGateway gateway = resolveGateway(normalizedProvider);
        PaymentGatewayCallbackResult callbackResult = gateway.verifyCallback(request, payment);
        String normalizedCallbackStatus = normalizeRequiredCallbackStatus(callbackResult.status());

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

    @Transactional
    public String processCallbackAndResolveRedirect(String provider, PaymentCallbackRequest request) {
        PaymentCallbackResponse response = processCallback(provider, request);
        Payment payment = findPaymentByTransactionId(response.transactionId());
        String redirectUrl = PAYMENT_STATUS_SUCCEEDED.equals(response.paymentStatus())
                ? payment.getSuccessUrl()
                : payment.getCancelUrl();

        return appendPaymentQueryParams(redirectUrl, response);
    }

    private Payment findPaymentByTransactionId(String transactionId) {
        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new InvalidRequestException("Payment transaction id is required");
        }

        return paymentRepository.findByTransactionId(transactionId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for transaction id: " + transactionId));
    }

    // Callback isleminde odeme satirini PESSIMISTIC_WRITE ile kilitleyerek bulur; boylece
    // es zamanli duplicate/replay callback'ler serilestirilir ve cift islem onlenir (#7).
    private Payment findPaymentByTransactionOrReference(String transactionId, String providerReference) {
        String normalizedTransactionId = normalizeOptional(transactionId);
        String normalizedProviderReference = normalizeOptional(providerReference);

        if (normalizedTransactionId == null && normalizedProviderReference == null) {
            throw new InvalidRequestException("Payment callback requires transactionId or providerReference");
        }

        Optional<Payment> payment = normalizedTransactionId == null
                ? Optional.empty()
                : paymentRepository.findByTransactionIdForUpdate(normalizedTransactionId);

        if (payment.isPresent()) {
            return payment.get();
        }

        return paymentRepository.findByProviderReferenceForUpdate(normalizedProviderReference)
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
        Order order = payment.getOrder();

        // Siparis baska bir odeme ile zaten islenmisse (artik PENDING_PAYMENT degil), stok dusumu ve
        // sepet tuketimi TEKRAR yapilmamalidir; aksi halde ayni siparise ait ikinci bir odeme stogu
        // ikinci kez duserdi (PAID->PAID gecisi no-op oldugundan validateTransition engellemez).
        // Bu durumda yalnizca bu odeme kaydini basarili olarak isaretleriz (idempotent).
        if (!OrderStatusPolicy.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
            if (OrderStatusPolicy.CANCELLED.equalsIgnoreCase(order.getStatus())) {
                // Nadir yaris: siparis (orn. sure asimi) iptal edilmisken odeme basarili donerse; stok
                // iade edilmis olabilir. Odeme kaydini isaretle ama manuel inceleme/iade gerekebilir.
                log.warn("Iptal edilmis siparise ({}) ait odeme basarili dondu; manuel inceleme gerekebilir.",
                        order.getOrderNumber());
            }
            payment.setStatus(PAYMENT_STATUS_SUCCEEDED);
            payment.setPaidAt(java.time.OffsetDateTime.now());
            return paymentRepository.save(payment);
        }

        // Stok checkout aninda rezerve edildi; odeme basarisinda TEKRAR dusulmez.
        OrderStatusPolicy.validateTransition(order.getStatus(), OrderStatusPolicy.PAID);
        payment.setStatus(PAYMENT_STATUS_SUCCEEDED);
        payment.setPaidAt(java.time.OffsetDateTime.now());
        order.setStatus(OrderStatusPolicy.PAID);
        consumeSourceCart(order);
        Payment saved = paymentRepository.save(payment);
        sendOrderConfirmationQuietly(order);
        return saved;
    }

    // Siparis onay e-postasi: best-effort. orderEmailService runtime'da enjekte edilir (testlerde
    // null olabilir). Herhangi bir hata yutulur; e-posta gonderimi odeme akisini asla bozmaz.
    private void sendOrderConfirmationQuietly(Order order) {
        if (orderEmailService == null) {
            return;
        }
        try {
            orderEmailService.sendOrderConfirmation(order);
        } catch (Exception e) {
            log.warn("Siparis onay e-postasi gonderilemedi (siparis {}): {}",
                    order.getOrderNumber(), e.getMessage());
        }
    }

    // Odeme basariyla tamamlaninca siparisi olusturan sepeti CHECKED_OUT yapar; boylece ayni
    // sepetten tekrar siparis/odeme yapilamaz (#8). Sepet bulunamazsa sessizce gecilir.
    private void consumeSourceCart(Order order) {
        if (order.getCartId() == null) {
            return;
        }

        cartRepository.findById(order.getCartId()).ifPresent(cart -> {
            if (!CART_STATUS_CHECKED_OUT.equalsIgnoreCase(cart.getStatus())) {
                cart.setStatus(CART_STATUS_CHECKED_OUT);
                // sessionId'yi serbest birak: ayni tarayici oturumu sonraki istekte taze ve bos
                // bir ACTIVE sepet alir. Aksi halde tuketilmis sepet (kalemleri durdugu icin)
                // ayni sessionId ile tekrar "aktif sepet" gibi servis edilir; sepet bosalmamis gorunur.
                cart.setSessionId(null);
                cartRepository.save(cart);
            }
        });
    }

    private Payment completePaymentAsFailed(Payment payment) {
        Order order = payment.getOrder();

        // Siparis artik PENDING_PAYMENT degilse (orn. baska bir odeme ile zaten PAID olmus), basarisiz
        // bir callback siparisi iptal ETMEMELI ve stogu geri VERMEMELI; yalnizca bu odeme kaydini FAILED
        // olarak isaretler. Aksi halde eski/ikinci bir odemenin FAILED callback'i odenmis siparisi iptal
        // edip stogu serbest birakirdi (PAID -> CANCELLED gecisine izin verildiginden).
        if (!OrderStatusPolicy.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())) {
            payment.setStatus(PAYMENT_STATUS_FAILED);
            return paymentRepository.save(payment);
        }

        payment.setStatus(PAYMENT_STATUS_FAILED);
        // Odeme basarisiz/iptal: siparis 'Odenmedi' (EXPIRED) olur; gercek iptallerle karismaz ve
        // admin listelerinde gorunmez. Rezerve edilen stok geri verilir.
        order.setStatus(OrderStatusPolicy.EXPIRED);
        if (stockReservationService != null) {
            stockReservationService.release(order);
        }
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
        return toResponse(payment, paymentPageUrl, null);
    }

    private PaymentResponse toResponse(Payment payment, String paymentPageUrl, String checkoutFormContent) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getOrderNumber(),
                payment.getProvider(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getTransactionId(),
                payment.getProviderReference(),
                paymentPageUrl,
                checkoutFormContent
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

    private String appendPaymentQueryParams(String redirectUrl, PaymentCallbackResponse response) {
        String normalizedRedirectUrl = normalizeOptional(redirectUrl);
        if (normalizedRedirectUrl == null) {
            return "/";
        }

        String separator = normalizedRedirectUrl.contains("?") ? "&" : "?";
        return normalizedRedirectUrl
                + separator
                + "provider=" + encode(response.provider())
                + "&transactionId=" + encode(response.transactionId())
                + "&paymentStatus=" + encode(response.paymentStatus())
                + "&orderNumber=" + encode(response.orderNumber())
                + "&orderStatus=" + encode(response.orderStatus());
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value == null ? "" : value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
