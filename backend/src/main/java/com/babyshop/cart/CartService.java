package com.babyshop.cart;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.cart.dto.CheckoutSummaryResponse;
import com.babyshop.product.Product;
import com.babyshop.product.ProductImage;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.babyshop.cart.dto.CartItemResponse;
import com.babyshop.cart.dto.CartResponse;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartService {

    private static final String ACTIVE_STATUS = "ACTIVE";

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;

    public CartResponse getCart(String sessionId) {
        Cart cart = findOrCreateCart(sessionId);
        return toResponse(cart);
    }

    public CheckoutSummaryResponse getCheckoutSummary(String sessionId) {
        Cart cart = findCartBySessionId(sessionId);
        CartResponse cartResponse = toResponse(cart);

        if (cartResponse.items().isEmpty()) {
            throw new InvalidRequestException("Cart is empty for session id: " + sessionId);
        }

        cart.getItems().forEach(item -> validateVariantAvailability(item.getProductVariant(), item.getQuantity()));

        BigDecimal shippingAmount = BigDecimal.ZERO;
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal totalAmount = cartResponse.subtotal()
                .add(shippingAmount)
                .subtract(discountAmount);

        return new CheckoutSummaryResponse(
                cartResponse.id(),
                cartResponse.sessionId(),
                cartResponse.items(),
                cartResponse.totalQuantity(),
                cartResponse.subtotal(),
                shippingAmount,
                discountAmount,
                totalAmount,
                cartResponse.currency(),
                true
        );
    }

    @Transactional
    public CartResponse addCartItem(String sessionId, Long productVariantId, int quantity) {
        Cart cart = findOrCreateCart(sessionId);
        ProductVariant variant = findVariant(productVariantId);
        validateVariantAvailability(variant, quantity);

        CartItem item = cartItemRepository.findByCartIdAndProductVariantId(cart.getId(), productVariantId)
                .orElseGet(() -> {
                    CartItem newItem = new CartItem();
                    newItem.setCart(cart);
                    newItem.setProductVariant(variant);
                    newItem.setQuantity(0);
                    return newItem;
                });

        int updatedQuantity = item.getQuantity() + quantity;
        validateStockLimit(variant, updatedQuantity);
        item.setQuantity(updatedQuantity);
        cartItemRepository.save(item);

        return toResponse(findCartBySessionId(sessionId));
    }

    @Transactional
    public CartResponse updateCartItemQuantity(String sessionId, Long cartItemId, int quantity) {
        Cart cart = findCartBySessionId(sessionId);
        CartItem item = cartItemRepository.findByCartIdAndId(cart.getId(), cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item not found for session id: " + sessionId + " and item id: " + cartItemId
                ));

        validateStockLimit(item.getProductVariant(), quantity);
        item.setQuantity(quantity);
        cartItemRepository.save(item);

        return toResponse(findCartBySessionId(sessionId));
    }

    @Transactional
    public CartResponse removeCartItem(String sessionId, Long cartItemId) {
        Cart cart = findCartBySessionId(sessionId);
        CartItem item = cartItemRepository.findByCartIdAndId(cart.getId(), cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item not found for session id: " + sessionId + " and item id: " + cartItemId
                ));

        cart.getItems().remove(item);
        cartItemRepository.delete(item);
        return toResponse(findCartBySessionId(sessionId));
    }

    @Transactional
    protected Cart findOrCreateCart(String sessionId) {
        validateSessionId(sessionId);

        return cartRepository.findBySessionId(sessionId)
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setSessionId(sessionId.trim());
                    cart.setStatus(ACTIVE_STATUS);
                    return cartRepository.save(cart);
                });
    }

    private Cart findCartBySessionId(String sessionId) {
        validateSessionId(sessionId);

        return cartRepository.findBySessionId(sessionId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for session id: " + sessionId));
    }

    private ProductVariant findVariant(Long productVariantId) {
        return productVariantRepository.findById(productVariantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product variant not found for id: " + productVariantId));
    }

    private void validateVariantAvailability(ProductVariant variant, int quantity) {
        if (!variant.isActive()) {
            throw new InvalidRequestException("Product variant is not active for id: " + variant.getId());
        }

        if (!variant.getProduct().isActive()) {
            throw new InvalidRequestException("Product is not active for variant id: " + variant.getId());
        }

        validateStockLimit(variant, quantity);
    }

    private void validateStockLimit(ProductVariant variant, int requestedQuantity) {
        if (requestedQuantity > variant.getStockQuantity()) {
            throw new InvalidRequestException("Requested quantity exceeds available stock for variant id: " + variant.getId());
        }
    }

    private void validateSessionId(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            throw new InvalidRequestException("Cart session id is required");
        }
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .sorted(Comparator.comparing(CartItem::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(CartItem::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toItemResponse)
                .toList();

        int totalQuantity = items.stream()
                .mapToInt(CartItemResponse::quantity)
                .sum();

        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String currency = items.isEmpty() ? "TRY" : items.getFirst().currency();

        return new CartResponse(
                cart.getId(),
                cart.getSessionId(),
                cart.getStatus(),
                items,
                totalQuantity,
                subtotal,
                currency
        );
    }

    private CartItemResponse toItemResponse(CartItem item) {
        ProductVariant variant = item.getProductVariant();
        Product product = variant.getProduct();
        BigDecimal lineTotal = variant.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));

        return new CartItemResponse(
                item.getId(),
                product.getId(),
                product.getName(),
                product.getSlug(),
                extractPrimaryImageUrl(product),
                variant.getId(),
                variant.getSku(),
                variant.getSizeLabel(),
                variant.getColorName(),
                item.getQuantity(),
                variant.getPrice(),
                lineTotal,
                variant.getCurrency()
        );
    }

    private String extractPrimaryImageUrl(Product product) {
        return product.getImages().stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getImageUrl)
                .findFirst()
                .or(() -> product.getImages().stream()
                        .min(Comparator.comparingInt(ProductImage::getSortOrder)
                                .thenComparing(ProductImage::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                        .map(ProductImage::getImageUrl))
                .orElse(null);
    }
}
