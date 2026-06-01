package com.babyshop.order;

import com.babyshop.cart.Cart;
import com.babyshop.cart.CartItem;
import com.babyshop.cart.CartRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.order.dto.CreateOrderRequest;
import com.babyshop.order.dto.OrderItemResponse;
import com.babyshop.order.dto.OrderResponse;
import com.babyshop.order.dto.OrderStatusUpdateRequest;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private static final String CART_STATUS_ACTIVE = "ACTIVE";
    private static final String CART_STATUS_CHECKED_OUT = "CHECKED_OUT";
    private static final String ORDER_STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    private static final Set<String> ALLOWED_ORDER_STATUSES = new LinkedHashSet<>(Arrays.asList(
            "PENDING_PAYMENT",
            "PAID",
            "PREPARING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED"
    ));

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final ProductVariantRepository productVariantRepository;

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public OrderResponse getOrderByOrderNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new InvalidRequestException("Order number is required");
        }

        Order order = orderRepository.findByOrderNumber(orderNumber.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));

        return toResponse(order);
    }

    @Transactional
    public OrderResponse updateOrderStatus(String orderNumber, OrderStatusUpdateRequest request) {
        String normalizedOrderNumber = normalizeRequiredOrderNumber(orderNumber);
        String normalizedStatus = normalizeRequiredStatus(request.status());

        if (!ALLOWED_ORDER_STATUSES.contains(normalizedStatus)) {
            throw new InvalidRequestException("Unsupported order status: " + normalizedStatus);
        }

        Order order = orderRepository.findByOrderNumber(normalizedOrderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for order number: " + orderNumber));

        order.setStatus(normalizedStatus);
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Cart cart = cartRepository.findBySessionId(request.sessionId().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for session id: " + request.sessionId()));

        validateCartForCheckout(cart);

        List<CartItem> cartItems = cart.getItems();
        String currency = validateCartCurrencies(cartItems);
        BigDecimal shippingAmount = BigDecimal.ZERO;
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal subtotalAmount = BigDecimal.ZERO;

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setStatus(ORDER_STATUS_PENDING_PAYMENT);
        order.setCustomerEmail(request.customerEmail().trim().toLowerCase(Locale.ROOT));
        order.setCustomerFirstName(normalize(request.customerFirstName()));
        order.setCustomerLastName(normalize(request.customerLastName()));
        order.setCustomerPhone(normalize(request.customerPhone()));
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

    private String normalizeRequiredStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new InvalidRequestException("Order status is required");
        }

        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalize(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
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
}
