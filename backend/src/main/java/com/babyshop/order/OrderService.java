package com.babyshop.order;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.cart.Cart;
import com.babyshop.cart.CartItem;
import com.babyshop.common.response.PageResponse;
import com.babyshop.cart.CartRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.customer.CustomerAddress;
import com.babyshop.customer.CustomerAddressRepository;
import com.babyshop.order.dto.CreateOrderRequest;
import com.babyshop.order.dto.GuestOrderResponse;
import com.babyshop.order.dto.OrderAddressRequest;
import com.babyshop.order.dto.OrderAddressResponse;
import com.babyshop.order.dto.OrderItemResponse;
import com.babyshop.order.dto.OrderPaymentSummaryResponse;
import com.babyshop.order.dto.OrderResponse;
import com.babyshop.order.dto.OrderStatusUpdateRequest;
import com.babyshop.notification.OrderEmailService;
import com.babyshop.payment.Payment;
import com.babyshop.payment.PaymentRepository;
import com.babyshop.product.ProductImage;
import com.babyshop.product.ProductImageRepository;
import com.babyshop.product.ProductVariant;
import com.babyshop.settings.StoreSettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class OrderService {

    private static final String CART_STATUS_ACTIVE = "ACTIVE";
    private static final String CART_STATUS_CHECKED_OUT = "CHECKED_OUT";

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final UserAccountRepository userAccountRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final PaymentRepository paymentRepository;
    private final StoreSettingService storeSettingService;
    private final ProductImageRepository productImageRepository;
    private final StockReservationService stockReservationService;

    // Opsiyonel enjeksiyon: @RequiredArgsConstructor'a girmez, boylece testlerdeki manuel
    // `new OrderService(...)` cagrilari degismeden derlenir; runtime'da Spring enjekte eder.
    @Autowired(required = false)
    private OrderEmailService orderEmailService;

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public PageResponse<OrderResponse> getAllOrders(
            int page,
            int size,
            String orderNumber,
            String status,
            String paymentMethod,
            LocalDate from,
            LocalDate to
    ) {
        validateDateRange(from, to);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Order> specification = Specification.where(hasOrderNumber(orderNumber))
                .and(hasStatus(status))
                .and(hasPaymentMethod(paymentMethod))
                .and(hideExpiredUnlessRequested(status))
                .and(createdAtOnOrAfter(from))
                .and(createdAtBeforeOrOn(to));

        Page<OrderResponse> result = orderRepository.findAll(specification, pageable)
                .map(this::toResponse);

        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext(),
                result.hasPrevious()
        );
    }

    // Admin/dahili kullanim: sahiplik kontrolu yapmaz (cagrildigi yer ADMIN rolu ile korunur).
    public OrderResponse getOrderByOrderNumber(String orderNumber) {
        return toResponse(findOrderByOrderNumber(orderNumber));
    }

    // Musteri-yonlu: siparis detayini yalnizca siparisi olusturan kullanici gorebilir.
    public OrderResponse getOrderByOrderNumber(String orderNumber, String authenticatedEmail) {
        Order order = findOrderByOrderNumber(orderNumber);

        // Sahibi olmayan/anonim siparislerde varlik bilgisini sizdirmamak icin 404 donuyoruz.
        if (!isOrderOwnedBy(order, authenticatedEmail)) {
            throw new ResourceNotFoundException("Order not found for order number: " + orderNumber);
        }

        return toResponse(order);
    }

    // Misafir takibi: siparis numarasi + e-posta eslesirse siparisi dondurur. Eslesmezse,
    // bir siparisin varligini sizdirmamak icin 404 firlatir (numara tahminine karsi).
    // Kimlik dogrulanmamis uc oldugundan yalin (PII'siz) yanit doner.
    public GuestOrderResponse getOrderByOrderNumberAndEmail(String orderNumber, String email) {
        Order order = findOrderByOrderNumber(orderNumber);
        String normalizedEmail = normalizeOptionalEmail(email);

        if (normalizedEmail == null
                || order.getCustomerEmail() == null
                || !normalizedEmail.equalsIgnoreCase(order.getCustomerEmail())) {
            throw new ResourceNotFoundException("Order not found for order number: " + orderNumber);
        }

        return toGuestResponse(order);
    }

    private GuestOrderResponse toGuestResponse(Order order) {
        Map<Long, String> imageUrls = resolveItemImageUrls(order.getItems());
        return new GuestOrderResponse(
                order.getOrderNumber(),
                order.getStatus(),
                order.getCustomerFirstName(),
                order.getCustomerLastName(),
                order.getSubtotalAmount(),
                order.getShippingAmount(),
                order.getDiscountAmount(),
                order.getCodSurcharge(),
                order.getTotalAmount(),
                order.getCurrency(),
                order.getPaymentMethod(),
                order.getShippingCarrier(),
                order.getCreatedAt(),
                new OrderAddressResponse(
                        order.getShippingAddressLine1(),
                        order.getShippingAddressLine2(),
                        order.getShippingDistrict(),
                        order.getShippingCity(),
                        order.getShippingPostalCode(),
                        order.getShippingCountry()
                ),
                order.getNotes(),
                order.getItems().stream()
                        .map(item -> toItemResponse(item, imageUrls))
                        .toList()
        );
    }

    private Order findOrderByOrderNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new InvalidRequestException("Order number is required");
        }

        return orderRepository.findByOrderNumber(orderNumber.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));
    }

    private boolean isOrderOwnedBy(Order order, String authenticatedEmail) {
        String normalizedEmail = normalizeOptionalEmail(authenticatedEmail);
        if (normalizedEmail == null || order.getUser() == null) {
            return false;
        }

        return normalizedEmail.equalsIgnoreCase(order.getUser().getEmail());
    }

    public List<OrderResponse> getOrdersByUserEmail(String email) {
        String normalizedEmail = normalizeRequiredEmail(email);

        return orderRepository.findAllByUserEmailIgnoreCaseOrderByCreatedAtDesc(normalizedEmail).stream()
                .map(this::toResponse)
                .toList();
    }

    public PageResponse<OrderResponse> getOrdersByUserEmail(
            String email,
            int page,
            int size,
            String orderNumber,
            String status,
            LocalDate from,
            LocalDate to
    ) {
        String normalizedEmail = normalizeRequiredEmail(email);
        validateDateRange(from, to);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Order> specification = Specification.where(hasUserEmail(normalizedEmail))
                .and(hasOrderNumber(orderNumber))
                .and(hasStatus(status))
                .and(hideExpiredUnlessRequested(status))
                .and(createdAtOnOrAfter(from))
                .and(createdAtBeforeOrOn(to));

        Page<OrderResponse> result = orderRepository.findAll(specification, pageable)
                .map(this::toResponse);

        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext(),
                result.hasPrevious()
        );
    }

    @Transactional
    public OrderResponse updateOrderStatus(String orderNumber, OrderStatusUpdateRequest request) {
        String normalizedOrderNumber = normalizeRequiredOrderNumber(orderNumber);
        String normalizedStatus = OrderStatusPolicy.normalizeRequiredStatus(request.status());

        Order order = orderRepository.findByOrderNumber(normalizedOrderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));

        // Rezerve durumdaki (PENDING/PAID) bir siparis iptal edilirse rezerve stok geri verilir.
        boolean wasReserved = OrderStatusPolicy.PENDING_PAYMENT.equalsIgnoreCase(order.getStatus())
                || OrderStatusPolicy.PAID.equalsIgnoreCase(order.getStatus());
        OrderStatusPolicy.validateTransition(order.getStatus(), normalizedStatus);
        if (OrderStatusPolicy.CANCELLED.equalsIgnoreCase(normalizedStatus)) {
            if (wasReserved) {
                stockReservationService.release(order);
            }
            order.setCancellationReason(normalize(request.cancellationReason()));
        }
        order.setStatus(normalizedStatus);
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, String authenticatedEmail) {
        Cart cart = cartRepository.findBySessionId(request.sessionId().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for session id: " + request.sessionId()));

        validateCartForCheckout(cart);
        String normalizedAuthenticatedEmail = normalizeOptionalEmail(authenticatedEmail);
        ShippingDetails shippingDetails = resolveShippingDetails(request, normalizedAuthenticatedEmail);
        String paymentMethod = resolvePaymentMethod(request.paymentMethod());
        String shippingCarrier = resolveShippingCarrier(request.shippingCarrier());

        List<CartItem> cartItems = cart.getItems();
        String currency = validateCartCurrencies(cartItems);
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal subtotalAmount = BigDecimal.ZERO;

        // Idempotency: ayni sepet icin zaten bekleyen bir siparis varsa yeni satir olusturmayiz;
        // mevcut siparisi guncelleyip yeniden kullaniriz. Boylece modal kapatilip tekrar denendiginde
        // ayni sepetten birden fazla PENDING siparis (ve olasi cift cekim) olusmaz.
        Order order = orderRepository.findFirstByCartIdAndStatus(cart.getId(), OrderStatusPolicy.PENDING_PAYMENT)
                .orElseGet(Order::new);
        if (order.getOrderNumber() == null) {
            order.setOrderNumber(generateOrderNumber());
        }
        // Yeniden kullanilan bir siparisse onceki rezervasyonu geri ver; kalemler yeniden kurulup
        // guncel miktarlara gore tekrar rezerve edilecek.
        if (!order.getItems().isEmpty()) {
            stockReservationService.release(order);
        }
        order.getItems().clear();
        resolveAuthenticatedUser(normalizedAuthenticatedEmail).ifPresent(order::setUser);
        order.setCartId(cart.getId());
        // Kapida odeme / havale: cevrimici odeme adimi yok; siparis dogrudan 'Onaylandi' (PAID)
        // olarak olusur ve asla otomatik iptale (EXPIRED) dusmez. Kart: odeme tamamlanana kadar
        // PENDING_PAYMENT'ta bekler.
        order.setStatus(PaymentMethodPolicy.isOffline(paymentMethod)
                ? OrderStatusPolicy.PAID
                : OrderStatusPolicy.PENDING_PAYMENT);
        order.setCustomerEmail(request.customerEmail().trim().toLowerCase(Locale.ROOT));
        order.setCustomerFirstName(shippingDetails.customerFirstName());
        order.setCustomerLastName(shippingDetails.customerLastName());
        order.setCustomerPhone(shippingDetails.customerPhone());
        order.setShippingAddressLine1(shippingDetails.address().line1());
        order.setShippingAddressLine2(shippingDetails.address().line2());
        order.setShippingDistrict(shippingDetails.address().district());
        order.setShippingCity(shippingDetails.address().city());
        order.setShippingPostalCode(shippingDetails.address().postalCode());
        order.setShippingCountry(shippingDetails.address().country());
        order.setNotes(normalize(request.notes()));
        order.setCurrency(currency);
        order.setDiscountAmount(discountAmount);
        order.setPaymentMethod(paymentMethod);
        order.setShippingCarrier(shippingCarrier);

        for (CartItem cartItem : cartItems) {
            ProductVariant variant = cartItem.getProductVariant();
            validateVariantForOrder(variant, cartItem.getQuantity());

            BigDecimal lineTotal = variant.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            subtotalAmount = subtotalAmount.add(lineTotal);

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProductId(variant.getProduct().getId());
            orderItem.setProductVariantId(variant.getId());
            orderItem.setProductName(variant.getProduct().getName());
            orderItem.setVariantLabel(variant.getSizeLabel() + " / " + variant.getColorName());
            orderItem.setSku(variant.getSku());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setUnitPrice(variant.getPrice());
            orderItem.setLineTotal(lineTotal);
            orderItem.setCurrency(variant.getCurrency());
            order.getItems().add(orderItem);
        }

        // Minimum sepet tutari kontrolu (sunucu tarafi guvenlik agi; frontend de engeller).
        enforceMinimumOrderAmount(subtotalAmount);

        // Kapida odemede toplama ek ucret eklenir; diger yontemlerde 0.
        BigDecimal codSurcharge = PaymentMethodPolicy.COD.equals(paymentMethod)
                ? storeSettingService.getCodSurcharge()
                : BigDecimal.ZERO;

        // Kargo ücreti ara toplam belli olduktan sonra hesaplanır (eşik üstü ücretsiz).
        BigDecimal shippingAmount = storeSettingService.calculateShipping(subtotalAmount);
        order.setShippingAmount(shippingAmount);
        order.setSubtotalAmount(subtotalAmount);
        order.setCodSurcharge(codSurcharge);
        order.setTotalAmount(subtotalAmount.add(shippingAmount).add(codSurcharge).subtract(discountAmount));

        // Stogu checkout aninda atomik olarak rezerve et (oversell'i onler). Yetersiz stokta istisna
        // firlatir ve @Transactional oldugundan tum islem (rezervasyon dahil) geri alinir.
        stockReservationService.reserve(order);

        Order saved = orderRepository.save(order);

        // CARD (iyzico): sepet tuketimi ve onay e-postasi odeme basariyla tamamlaninca PaymentService'te
        // yapilir. COD/EFT: cevrimici odeme adimi yok; siparis burada kesinlestirilir (sepet tuketilir,
        // onay e-postasi gonderilir). Siparis PENDING_PAYMENT'ta bekler; admin odemeyi/havaleyi
        // onaylayinca PAID'e gecirir.
        if (PaymentMethodPolicy.isOffline(paymentMethod)) {
            finalizeOfflineOrder(saved);
        }

        return toResponse(saved);
    }

    // Kapida odeme / havale siparisini kesinlestirir: kaynak sepeti tuketir ve onay e-postasi gonderir.
    private void finalizeOfflineOrder(Order order) {
        consumeSourceCart(order);
        sendOrderConfirmationQuietly(order);
    }

    // Siparisi olusturan sepeti CHECKED_OUT yapar; boylece ayni sepetten tekrar siparis olusturulamaz
    // ve musterinin sepeti bosalir. (PaymentService'teki es mantigin cevrimdisi karsiligi.)
    private void consumeSourceCart(Order order) {
        if (order.getCartId() == null) {
            return;
        }
        cartRepository.findById(order.getCartId()).ifPresent(cart -> {
            if (!CART_STATUS_CHECKED_OUT.equalsIgnoreCase(cart.getStatus())) {
                cart.setStatus(CART_STATUS_CHECKED_OUT);
                cart.setSessionId(null);
                cartRepository.save(cart);
            }
        });
    }

    // Onay e-postasi best-effort; orderEmailService testlerde null olabilir, hata yutulur.
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

    private void enforceMinimumOrderAmount(BigDecimal subtotalAmount) {
        BigDecimal minimumOrderAmount = storeSettingService.getMinimumOrderAmount();
        if (minimumOrderAmount != null
                && minimumOrderAmount.signum() > 0
                && subtotalAmount.compareTo(minimumOrderAmount) < 0) {
            throw new InvalidRequestException(
                    "Minimum sepet tutarı " + minimumOrderAmount.stripTrailingZeros().toPlainString()
                            + " ₺. Lütfen sepetinize ürün ekleyin."
            );
        }
    }

    private String resolvePaymentMethod(String requestedMethod) {
        String method = PaymentMethodPolicy.normalizeOrDefault(requestedMethod);
        // Yalnizca musteri acikca bir yontem sectiyse "acik mi" kontrolu yapilir; boylece yontem
        // belirtmeyen eski istekler CARD varsayilaniyla calismaya devam eder.
        if (requestedMethod == null || requestedMethod.isBlank()) {
            return method;
        }
        boolean enabled = switch (method) {
            case PaymentMethodPolicy.CARD -> storeSettingService.isCardEnabled();
            case PaymentMethodPolicy.COD -> storeSettingService.isCodEnabled();
            case PaymentMethodPolicy.EFT -> storeSettingService.isBankTransferEnabled();
            default -> false;
        };
        if (!enabled) {
            throw new InvalidRequestException("Seçilen ödeme yöntemi şu anda kullanılamıyor.");
        }
        return method;
    }

    private String resolveShippingCarrier(String requestedCarrier) {
        List<String> carriers = storeSettingService.getShippingCarriers();
        String carrier = normalize(requestedCarrier);

        // Kargo firmasi tanimli degilse secim zorunlu tutulmaz (geriye donuk uyumluluk).
        if (carriers.isEmpty()) {
            return carrier;
        }
        if (carrier == null) {
            throw new InvalidRequestException("Lütfen bir kargo firması seçin.");
        }
        return carriers.stream()
                .filter(candidate -> candidate.equalsIgnoreCase(carrier))
                .findFirst()
                .orElseThrow(() -> new InvalidRequestException("Geçersiz kargo firması seçimi: " + requestedCarrier));
    }

    private java.util.Optional<UserAccount> resolveAuthenticatedUser(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isEmpty()) {
            return java.util.Optional.empty();
        }

        return userAccountRepository.findByEmailIgnoreCase(authenticatedEmail);
    }

    private ShippingDetails resolveShippingDetails(CreateOrderRequest request, String authenticatedEmail) {
        boolean hasAddressId = request.shippingAddressId() != null;
        boolean hasShippingAddress = request.shippingAddress() != null;

        if (hasAddressId && hasShippingAddress) {
            throw new InvalidRequestException("Provide either shippingAddressId or shippingAddress, not both");
        }

        if (hasAddressId) {
            if (authenticatedEmail == null) {
                throw new InvalidRequestException("Authenticated user is required when shippingAddressId is used");
            }

            CustomerAddress address = customerAddressRepository.findByIdAndUserEmailIgnoreCase(
                            request.shippingAddressId(),
                            authenticatedEmail
                    )
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Customer address not found for id: " + request.shippingAddressId()
                    ));

            return new ShippingDetails(
                    firstNonNull(normalize(request.customerFirstName()), normalize(address.getRecipientFirstName())),
                    firstNonNull(normalize(request.customerLastName()), normalize(address.getRecipientLastName())),
                    firstNonNull(normalize(request.customerPhone()), normalize(address.getPhoneNumber())),
                    new OrderAddressRequest(
                            address.getLine1(),
                            address.getLine2(),
                            address.getDistrict(),
                            address.getCity(),
                            address.getPostalCode(),
                            address.getCountry()
                    )
            );
        }

        if (!hasShippingAddress) {
            throw new InvalidRequestException("Shipping address is required");
        }

        return new ShippingDetails(
                normalize(request.customerFirstName()),
                normalize(request.customerLastName()),
                normalize(request.customerPhone()),
                request.shippingAddress()
        );
    }

    private void validateCartForCheckout(Cart cart) {
        if (!CART_STATUS_ACTIVE.equalsIgnoreCase(cart.getStatus())) {
            throw new InvalidRequestException("Cart is not active for checkout. Current status: " + cart.getStatus());
        }

        if (cart.getItems().isEmpty()) {
            throw new InvalidRequestException("Cart is empty for session id: " + cart.getSessionId());
        }
    }

    private String validateCartCurrencies(List<CartItem> cartItems) {
        String currency = null;

        for (CartItem cartItem : cartItems) {
            String itemCurrency = cartItem.getProductVariant().getCurrency();
            if (currency == null) {
                currency = itemCurrency;
                continue;
            }

            if (!currency.equalsIgnoreCase(itemCurrency)) {
                throw new InvalidRequestException("Cart contains items with different currencies");
            }
        }

        return currency == null ? "TRY" : currency.toUpperCase(Locale.ROOT);
    }

    private void validateVariantForOrder(ProductVariant variant, int quantity) {
        if (!variant.isActive()) {
            throw new InvalidRequestException("Bu ürün seçeneği şu anda satışta değil.");
        }

        if (!variant.getProduct().isActive()) {
            throw new InvalidRequestException("Bu ürün şu anda satışta değil.");
        }

        if (quantity > variant.getStockQuantity()) {
            int stock = variant.getStockQuantity();
            throw new InvalidRequestException(stock <= 0
                    ? ("\"" + variant.getProduct().getName() + "\" ürününden stok kalmadı; siparişiniz tamamlanamadı.")
                    : ("\"" + variant.getProduct().getName() + "\" ürününden stokta yalnızca " + stock
                            + " adet kaldı. Lütfen sepetteki adedi güncelleyin."));
        }
    }

    private String generateOrderNumber() {
        return "ORD-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
    }

    private String normalizeRequiredOrderNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new InvalidRequestException("Order number is required");
        }

        return orderNumber.trim();
    }

    private String normalizeRequiredEmail(String email) {
        String normalizedEmail = normalizeOptionalEmail(email);
        if (normalizedEmail == null) {
            throw new InvalidRequestException("Authenticated user email is required");
        }

        return normalizedEmail;
    }

    private String normalizeOptionalEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeOptionalStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return null;
        }

        return OrderStatusPolicy.normalizeRequiredStatus(status);
    }

    private String normalizeOptionalOrderNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            return null;
        }

        return orderNumber.trim().toUpperCase(Locale.ROOT);
    }

    private String normalize(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String firstNonNull(String primary, String fallback) {
        return primary != null ? primary : fallback;
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new InvalidRequestException("Order date range is invalid: from must be on or before to");
        }
    }

    private Specification<Order> hasUserEmail(String email) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(criteriaBuilder.lower(root.get("user").get("email")), email.toLowerCase(Locale.ROOT));
    }

    private Specification<Order> hasStatus(String status) {
        String normalizedStatus = normalizeOptionalStatus(status);
        if (normalizedStatus == null) {
            return null;
        }

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"), normalizedStatus);
    }

    // Belirli bir durum istenmediyse 'Odenmedi' (EXPIRED) siparisleri listeden gizler; boylece
    // terk edilen/odenmemis checkout'lar gercek siparislerle ve iptallerle karismaz.
    private Specification<Order> hideExpiredUnlessRequested(String status) {
        if (normalizeOptionalStatus(status) != null) {
            return null;
        }
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.notEqual(root.get("status"), OrderStatusPolicy.EXPIRED);
    }

    private Specification<Order> hasPaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.trim().isEmpty()) {
            return null;
        }
        String normalized = paymentMethod.trim().toUpperCase(Locale.ROOT);
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("paymentMethod"), normalized);
    }

    private Specification<Order> hasOrderNumber(String orderNumber) {
        String normalizedOrderNumber = normalizeOptionalOrderNumber(orderNumber);
        if (normalizedOrderNumber == null) {
            return null;
        }

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.like(criteriaBuilder.upper(root.get("orderNumber")), "%" + normalizedOrderNumber + "%");
    }

    private Specification<Order> createdAtOnOrAfter(LocalDate from) {
        if (from == null) {
            return null;
        }

        OffsetDateTime startOfDay = from.atStartOfDay().atOffset(OffsetDateTime.now().getOffset());
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startOfDay);
    }

    private Specification<Order> createdAtBeforeOrOn(LocalDate to) {
        if (to == null) {
            return null;
        }

        OffsetDateTime endExclusive = to.plusDays(1).atStartOfDay().atOffset(OffsetDateTime.now().getOffset());
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.lessThan(root.get("createdAt"), endExclusive);
    }

    private OrderResponse toResponse(Order order) {
        Map<Long, String> imageUrls = resolveItemImageUrls(order.getItems());
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus(),
                order.getCustomerEmail(),
                order.getCustomerFirstName(),
                order.getCustomerLastName(),
                order.getCustomerPhone(),
                order.getSubtotalAmount(),
                order.getShippingAmount(),
                order.getDiscountAmount(),
                order.getCodSurcharge(),
                order.getTotalAmount(),
                order.getCurrency(),
                order.getPaymentMethod(),
                order.getShippingCarrier(),
                order.getCreatedAt(),
                new OrderAddressResponse(
                        order.getShippingAddressLine1(),
                        order.getShippingAddressLine2(),
                        order.getShippingDistrict(),
                        order.getShippingCity(),
                        order.getShippingPostalCode(),
                        order.getShippingCountry()
                ),
                resolvePaymentSummary(order),
                order.getNotes(),
                order.getCancellationReason(),
                order.getItems().stream()
                        .map(item -> toItemResponse(item, imageUrls))
                        .toList()
        );
    }

    private OrderItemResponse toItemResponse(OrderItem item, Map<Long, String> imageUrls) {
        return new OrderItemResponse(
                item.getId(),
                item.getProductId(),
                item.getProductVariantId(),
                item.getProductName(),
                item.getVariantLabel(),
                item.getSku(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal(),
                item.getCurrency(),
                item.getProductId() == null ? null : imageUrls.get(item.getProductId())
        );
    }

    // Siparis kalemleri gorseli snapshot'lamiyor; urun kimliginden ana gorseli tek sorguyla cozeriz
    // (siparis basina 1 sorgu, kalem basina N+1 degil). Once primary, yoksa en dusuk sortOrder.
    private Map<Long, String> resolveItemImageUrls(List<OrderItem> items) {
        Set<Long> productIds = items.stream()
                .map(OrderItem::getProductId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (productIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> firstByProduct = new HashMap<>();
        Map<Long, String> primaryByProduct = new HashMap<>();
        for (ProductImage image : productImageRepository.findAllByProductIdInOrderBySortOrderAscIdAsc(productIds)) {
            Long productId = image.getProduct().getId();
            firstByProduct.putIfAbsent(productId, image.getImageUrl());
            if (image.isPrimary()) {
                primaryByProduct.putIfAbsent(productId, image.getImageUrl());
            }
        }

        Map<Long, String> resolved = new HashMap<>(firstByProduct);
        resolved.putAll(primaryByProduct);
        return resolved;
    }

    private OrderPaymentSummaryResponse resolvePaymentSummary(Order order) {
        List<Payment> payments = paymentRepository.findAllByOrderOrderNumberOrderByCreatedAtDesc(order.getOrderNumber());
        if (payments == null) {
            return null;
        }

        return payments.stream()
                .findFirst()
                .map(this::toPaymentSummaryResponse)
                .orElse(null);
    }

    private OrderPaymentSummaryResponse toPaymentSummaryResponse(Payment payment) {
        return new OrderPaymentSummaryResponse(
                payment.getProvider(),
                payment.getStatus(),
                payment.getTransactionId(),
                payment.getProviderReference(),
                payment.getPaidAt()
        );
    }

    private record ShippingDetails(
            String customerFirstName,
            String customerLastName,
            String customerPhone,
            OrderAddressRequest address
    ) {
    }
}
