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
import com.babyshop.order.dto.OrderAddressRequest;
import com.babyshop.order.dto.OrderAddressResponse;
import com.babyshop.order.dto.OrderItemResponse;
import com.babyshop.order.dto.OrderPaymentSummaryResponse;
import com.babyshop.order.dto.OrderResponse;
import com.babyshop.order.dto.OrderStatusUpdateRequest;
import com.babyshop.payment.Payment;
import com.babyshop.payment.PaymentRepository;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private static final String CART_STATUS_ACTIVE = "ACTIVE";
    private static final String CART_STATUS_CHECKED_OUT = "CHECKED_OUT";

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserAccountRepository userAccountRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final PaymentRepository paymentRepository;

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
            LocalDate from,
            LocalDate to
    ) {
        validateDateRange(from, to);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Order> specification = Specification.where(hasOrderNumber(orderNumber))
                .and(hasStatus(status))
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

    public OrderResponse getOrderByOrderNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new InvalidRequestException("Order number is required");
        }

        Order order = orderRepository.findByOrderNumber(orderNumber.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));

        return toResponse(order);
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
            String status,
            LocalDate from,
            LocalDate to
    ) {
        String normalizedEmail = normalizeRequiredEmail(email);
        validateDateRange(from, to);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Order> specification = Specification.where(hasUserEmail(normalizedEmail))
                .and(hasStatus(status))
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

        OrderStatusPolicy.validateTransition(order.getStatus(), normalizedStatus);
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

        List<CartItem> cartItems = cart.getItems();
        String currency = validateCartCurrencies(cartItems);
        BigDecimal shippingAmount = BigDecimal.ZERO;
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal subtotalAmount = BigDecimal.ZERO;

        Order order = new Order();
        resolveAuthenticatedUser(normalizedAuthenticatedEmail).ifPresent(order::setUser);
        order.setOrderNumber(generateOrderNumber());
        order.setStatus(OrderStatusPolicy.PENDING_PAYMENT);
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
        order.setShippingAmount(shippingAmount);
        order.setDiscountAmount(discountAmount);

        List<ProductVariant> updatedVariants = new ArrayList<>();
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

            variant.setStockQuantity(variant.getStockQuantity() - cartItem.getQuantity());
            updatedVariants.add(variant);
        }

        order.setSubtotalAmount(subtotalAmount);
        order.setTotalAmount(subtotalAmount.add(shippingAmount).subtract(discountAmount));

        productVariantRepository.saveAll(updatedVariants);
        cart.setStatus(CART_STATUS_CHECKED_OUT);

        return toResponse(orderRepository.save(order));
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
            throw new InvalidRequestException("Product variant is not active for id: " + variant.getId());
        }

        if (!variant.getProduct().isActive()) {
            throw new InvalidRequestException("Product is not active for variant id: " + variant.getId());
        }

        if (quantity > variant.getStockQuantity()) {
            throw new InvalidRequestException("Requested quantity exceeds available stock for variant id: " + variant.getId());
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
                order.getTotalAmount(),
                order.getCurrency(),
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
                order.getItems().stream()
                        .map(this::toItemResponse)
                        .toList()
        );
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
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
                item.getCurrency()
        );
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
