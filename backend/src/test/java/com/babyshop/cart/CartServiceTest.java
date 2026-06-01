package com.babyshop.cart;

import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.Product;
import com.babyshop.product.ProductVariant;
import com.babyshop.product.ProductVariantRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @InjectMocks
    private CartService cartService;

    @Test
    void shouldCreateEmptyCartWhenMissing() {
        Cart savedCart = new Cart();
        savedCart.setId(1L);
        savedCart.setSessionId("session-1");
        savedCart.setStatus("ACTIVE");
        savedCart.setItems(new ArrayList<>());

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.empty(), Optional.of(savedCart));
        given(cartRepository.save(any(Cart.class))).willReturn(savedCart);

        var response = cartService.getCart("session-1");

        assertThat(response.sessionId()).isEqualTo("session-1");
        assertThat(response.totalQuantity()).isZero();
    }

    @Test
    void shouldReturnCheckoutSummaryForValidCart() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 12, true, true);
        CartItem item = new CartItem();
        item.setId(5L);
        item.setCart(cart);
        item.setProductVariant(variant);
        item.setQuantity(2);
        cart.getItems().add(item);

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));

        var response = cartService.getCheckoutSummary("session-1");

        assertThat(response.readyForCheckout()).isTrue();
        assertThat(response.totalAmount()).isEqualByComparingTo("998.00");
    }

    @Test
    void shouldAddNewItemToCart() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 12, true, true);

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart), Optional.of(cart));
        given(productVariantRepository.findById(10L)).willReturn(Optional.of(variant));
        given(cartItemRepository.findByCartIdAndProductVariantId(1L, 10L)).willReturn(Optional.empty());
        given(cartItemRepository.save(any(CartItem.class))).willAnswer(invocation -> {
            CartItem item = invocation.getArgument(0);
            item.setId(5L);
            cart.getItems().add(item);
            return item;
        });

        var response = cartService.addCartItem("session-1", 10L, 2);

        assertThat(response.totalQuantity()).isEqualTo(2);
        assertThat(response.subtotal()).isEqualByComparingTo("998.00");
    }

    @Test
    void shouldUpdateExistingCartItemQuantity() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 12, true, true);
        CartItem item = new CartItem();
        item.setId(5L);
        item.setCart(cart);
        item.setProductVariant(variant);
        item.setQuantity(2);
        cart.getItems().add(item);

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(cartItemRepository.findByCartIdAndId(1L, 5L)).willReturn(Optional.of(item));
        given(cartItemRepository.save(any(CartItem.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = cartService.updateCartItemQuantity("session-1", 5L, 4);

        assertThat(response.items().getFirst().quantity()).isEqualTo(4);
        assertThat(response.subtotal()).isEqualByComparingTo("1996.00");
    }

    @Test
    void shouldRemoveCartItem() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 12, true, true);
        CartItem item = new CartItem();
        item.setId(5L);
        item.setCart(cart);
        item.setProductVariant(variant);
        item.setQuantity(2);
        cart.getItems().add(item);

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart), Optional.of(cart));
        given(cartItemRepository.findByCartIdAndId(1L, 5L)).willReturn(Optional.of(item));

        var response = cartService.removeCartItem("session-1", 5L);

        verify(cartItemRepository).delete(item);
        assertThat(response.totalQuantity()).isZero();
    }

    @Test
    void shouldRejectStockOverflow() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 3, true, true);

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(productVariantRepository.findById(10L)).willReturn(Optional.of(variant));

        assertThatThrownBy(() -> cartService.addCartItem("session-1", 10L, 4))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Requested quantity exceeds available stock for variant id: 10");
    }

    @Test
    void shouldRejectInactiveVariant() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 12, false, true);

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(productVariantRepository.findById(10L)).willReturn(Optional.of(variant));

        assertThatThrownBy(() -> cartService.addCartItem("session-1", 10L, 1))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Product variant is not active for id: 10");
    }

    @Test
    void shouldThrowWhenCartItemMissing() {
        Cart cart = buildCart();

        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(cartItemRepository.findByCartIdAndId(1L, 5L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.updateCartItemQuantity("session-1", 5L, 2))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Cart item not found for session id: session-1 and item id: 5");
    }

    @Test
    void shouldRejectEmptyCartDuringCheckout() {
        Cart cart = buildCart();
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));

        assertThatThrownBy(() -> cartService.getCheckoutSummary("session-1"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Cart is empty for session id: session-1");
    }

    private Cart buildCart() {
        Cart cart = new Cart();
        cart.setId(1L);
        cart.setSessionId("session-1");
        cart.setStatus("ACTIVE");
        cart.setItems(new ArrayList<>());
        return cart;
    }

    private ProductVariant buildVariant(Long id, int stockQuantity, boolean active, boolean productActive) {
        Product product = new Product();
        product.setId(1L);
        product.setName("Baby Dress");
        product.setSlug("baby-dress");
        product.setActive(productActive);
        product.setImages(new ArrayList<>());

        ProductVariant variant = new ProductVariant();
        variant.setId(id);
        variant.setProduct(product);
        variant.setSku("SKU-1");
        variant.setSizeLabel("6-9 months");
        variant.setColorName("Pink");
        variant.setStockQuantity(stockQuantity);
        variant.setPrice(new BigDecimal("499.00"));
        variant.setCurrency("TRY");
        variant.setActive(active);
        return variant;
    }
}
