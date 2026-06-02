package com.babyshop.cart;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.cart.dto.CartItemResponse;
import com.babyshop.cart.dto.CartResponse;
import com.babyshop.cart.dto.CheckoutSummaryResponse;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.customer.CustomerAddress;
import com.babyshop.customer.CustomerAddressRepository;
import com.babyshop.customer.dto.CustomerAddressResponse;
import com.babyshop.product.Product;
import com.babyshop.product.ProductImage;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartService {

    private static final String ACTIVE_STATUS = "ACTIVE";

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserAccountRepository userAccountRepository;
    private final CustomerAddressRepository customerAddressRepository;

    public CartResponse getCart(String sessionId) {
        return getCart(sessionId, null);
    }

    @Transactional
    public CartResponse getCart(String sessionId, String authenticatedEmail) {
        Cart cart = findOrCreateCart(sessionId, authenticatedEmail);
        return toResponse(cart);
    }

    public CheckoutSummaryResponse getCheckoutSummary(String sessionId) {
        return getCheckoutSummary(sessionId, null);
    }

    public CheckoutSummaryResponse getCheckoutSummary(String sessionId, String authenticatedEmail) {
        Cart cart = findCartBySessionId(sessionId, authenticatedEmail);
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
        CustomerAddressResponse defaultShippingAddress = resolveDefaultShippingAddress(authenticatedEmail);

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
                true,
                defaultShippingAddress
        );
    }

    @Transactional
    public CartResponse addCartItem(String sessionId, Long productVariantId, int quantity) {
        return addCartItem(sessionId, productVariantId, quantity, null);
    }

    @Transactional
    public CartResponse addCartItem(String sessionId, Long productVariantId, int quantity, String authenticatedEmail) {
        Cart cart = findOrCreateCart(sessionId, authenticatedEmail);
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

        return toResponse(findCartBySessionId(sessionId, authenticatedEmail));
    }

    @Transactional
    public CartResponse updateCartItemQuantity(String sessionId, Long cartItemId, int quantity) {
        return updateCartItemQuantity(sessionId, cartItemId, quantity, null);
    }

    @Transactional
    public CartResponse updateCartItemQuantity(String sessionId, Long cartItemId, int quantity, String authenticatedEmail) {
        Cart cart = findCartBySessionId(sessionId, authenticatedEmail);
        CartItem item = cartItemRepository.findByCartIdAndId(cart.getId(), cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item not found for session id: " + sessionId + " and item id: " + cartItemId
                ));

        validateStockLimit(item.getProductVariant(), quantity);
        item.setQuantity(quantity);
        cartItemRepository.save(item);

        return toResponse(findCartBySessionId(sessionId, authenticatedEmail));
    }

    @Transactional
    public CartResponse removeCartItem(String sessionId, Long cartItemId) {
        return removeCartItem(sessionId, cartItemId, null);
    }

    @Transactional
    public CartResponse removeCartItem(String sessionId, Long cartItemId, String authenticatedEmail) {
        Cart cart = findCartBySessionId(sessionId, authenticatedEmail);
        CartItem item = cartItemRepository.findByCartIdAndId(cart.getId(), cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cart item not found for session id: " + sessionId + " and item id: " + cartItemId
                ));

        cart.getItems().remove(item);
        cartItemRepository.delete(item);
        return toResponse(findCartBySessionId(sessionId, authenticatedEmail));
    }

    @Transactional
    protected Cart findOrCreateCart(String sessionId) {
        return findOrCreateCart(sessionId, null);
    }

    @Transactional
    protected Cart findOrCreateCart(String sessionId, String authenticatedEmail) {
        String normalizedSessionId = normalizeRequiredSessionId(sessionId);

        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            return cartRepository.findBySessionId(normalizedSessionId)
                    .orElseGet(() -> createCart(normalizedSessionId, null));
        }

        UserAccount user = resolveAuthenticatedUser(authenticatedEmail);
        Optional<Cart> sessionCartOptional = cartRepository.findBySessionId(normalizedSessionId);
        Optional<Cart> userCartOptional = cartRepository.findByUserEmailIgnoreCaseAndStatus(user.getEmail(), ACTIVE_STATUS);

        if (sessionCartOptional.isPresent()) {
            Cart sessionCart = sessionCartOptional.get();
            validateCartOwnership(sessionCart, user.getEmail(), normalizedSessionId);

            if (userCartOptional.isPresent() && !userCartOptional.get().getId().equals(sessionCart.getId())) {
                return mergeCarts(userCartOptional.get(), sessionCart, normalizedSessionId, user);
            }

            return assignCartToUserIfNeeded(sessionCart, user);
        }

        if (userCartOptional.isPresent()) {
            Cart userCart = userCartOptional.get();
            if (!normalizedSessionId.equals(userCart.getSessionId())) {
                userCart.setSessionId(normalizedSessionId);
                return cartRepository.save(userCart);
            }
            return userCart;
        }

        return createCart(normalizedSessionId, user);
    }

    private Cart findCartBySessionId(String sessionId) {
        return findCartBySessionId(sessionId, null);
    }

    private Cart findCartBySessionId(String sessionId, String authenticatedEmail) {
        String normalizedSessionId = normalizeRequiredSessionId(sessionId);

        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            return cartRepository.findBySessionId(normalizedSessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cart not found for session id: " + sessionId));
        }

        return findOrCreateCart(normalizedSessionId, authenticatedEmail);
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

    private String normalizeRequiredSessionId(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            throw new InvalidRequestException("Cart session id is required");
        }
        return sessionId.trim();
    }

    private UserAccount resolveAuthenticatedUser(String authenticatedEmail) {
        return userAccountRepository.findByEmailIgnoreCase(authenticatedEmail.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated user not found for email: " + authenticatedEmail
                ));
    }

    private void validateCartOwnership(Cart cart, String authenticatedEmail, String sessionId) {
        if (cart.getUser() == null) {
            return;
        }

        if (!cart.getUser().getEmail().equalsIgnoreCase(authenticatedEmail)) {
            throw new InvalidRequestException(
                    "Cart session id does not belong to authenticated user: " + sessionId
            );
        }
    }

    private Cart assignCartToUserIfNeeded(Cart cart, UserAccount user) {
        if (cart.getUser() != null) {
            return cart;
        }

        cart.setUser(user);
        return cartRepository.save(cart);
    }

    private Cart createCart(String sessionId, UserAccount user) {
        Cart cart = new Cart();
        cart.setSessionId(sessionId);
        cart.setStatus(ACTIVE_STATUS);
        cart.setUser(user);
        return cartRepository.save(cart);
    }

    private Cart mergeCarts(Cart targetCart, Cart sourceCart, String sessionId, UserAccount user) {
        for (CartItem sourceItem : List.copyOf(sourceCart.getItems())) {
            sourceCart.getItems().remove(sourceItem);
            CartItem targetItem = targetCart.getItems().stream()
                    .filter(item -> item.getProductVariant().getId().equals(sourceItem.getProductVariant().getId()))
                    .findFirst()
                    .orElse(null);

            if (targetItem == null) {
                sourceItem.setCart(targetCart);
                targetCart.getItems().add(sourceItem);
                continue;
            }

            int mergedQuantity = targetItem.getQuantity() + sourceItem.getQuantity();
            validateStockLimit(sourceItem.getProductVariant(), mergedQuantity);
            targetItem.setQuantity(mergedQuantity);
        }

        targetCart.setUser(user);
        cartRepository.delete(sourceCart);
        cartRepository.flush();
        targetCart.setSessionId(sessionId);
        return cartRepository.save(targetCart);
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

    private CustomerAddressResponse resolveDefaultShippingAddress(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            return null;
        }

        return customerAddressRepository.findFirstByUserEmailIgnoreCaseAndIsDefaultTrue(authenticatedEmail.trim())
                .map(this::toAddressResponse)
                .orElse(null);
    }

    private CustomerAddressResponse toAddressResponse(CustomerAddress address) {
        return new CustomerAddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientFirstName(),
                address.getRecipientLastName(),
                address.getPhoneNumber(),
                address.getLine1(),
                address.getLine2(),
                address.getDistrict(),
                address.getCity(),
                address.getPostalCode(),
                address.getCountry(),
                address.isDefault(),
                address.getCreatedAt(),
                address.getUpdatedAt()
        );
    }
}
