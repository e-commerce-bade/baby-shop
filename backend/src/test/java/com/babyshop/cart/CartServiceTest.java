package com.babyshop.cart;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.customer.CustomerAddress;
import com.babyshop.customer.CustomerAddressRepository;
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

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private CustomerAddressRepository customerAddressRepository;

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
        assertThat(response.defaultShippingAddress()).isNull();
    }

    @Test
    void shouldIncludeDefaultAddressInAuthenticatedCheckoutSummary() {
        Cart cart = buildCart();
        ProductVariant variant = buildVariant(10L, 12, true, true);
        CartItem item = new CartItem();
        item.setId(5L);
        item.setCart(cart);
        item.setProductVariant(variant);
        item.setQuantity(2);
        cart.getItems().add(item);

        CustomerAddress address = new CustomerAddress();
        address.setId(20L);
        address.setLabel("Home");
        address.setRecipientFirstName("Ceren");
        address.setRecipientLastName("Yilmaz");
        address.setPhoneNumber("5551112233");
        address.setLine1("Ataturk Cd. No:10");
        address.setDistrict("Kadikoy");
        address.setCity("Istanbul");
        address.setPostalCode("34710");
        address.setCountry("Turkey");
        address.setDefault(true);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local"))
                .willReturn(Optional.of(buildUser(10L, "customer@babyshop.local")));
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(cartRepository.findByUserEmailIgnoreCaseAndStatus("customer@babyshop.local", "ACTIVE"))
                .willReturn(Optional.empty());
        given(cartRepository.save(any(Cart.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(customerAddressRepository.findFirstByUserEmailIgnoreCaseAndIsDefaultTrue("customer@babyshop.local"))
                .willReturn(Optional.of(address));

        var response = cartService.getCheckoutSummary("session-1", "customer@babyshop.local");

        assertThat(response.defaultShippingAddress()).isNotNull();
        assertThat(response.defaultShippingAddress().id()).isEqualTo(20L);
        assertThat(response.defaultShippingAddress().label()).isEqualTo("Home");
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

    @Test
    void shouldAssignGuestCartToAuthenticatedUser() {
        Cart cart = buildCart();
        UserAccount user = buildUser(10L, "customer@babyshop.local");
        cart.setUser(null);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(cartRepository.findByUserEmailIgnoreCaseAndStatus("customer@babyshop.local", "ACTIVE"))
                .willReturn(Optional.empty());
        given(cartRepository.save(any(Cart.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = cartService.getCart("session-1", "customer@babyshop.local");

        assertThat(cart.getUser()).isEqualTo(user);
        assertThat(response.sessionId()).isEqualTo("session-1");
    }

    @Test
    void shouldReuseAuthenticatedUsersCartForNewSession() {
        Cart userCart = buildCart();
        userCart.setSessionId("old-session");
        UserAccount user = buildUser(10L, "customer@babyshop.local");
        userCart.setUser(user);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.empty());
        given(cartRepository.findByUserEmailIgnoreCaseAndStatus("customer@babyshop.local", "ACTIVE"))
                .willReturn(Optional.of(userCart));
        given(cartRepository.save(any(Cart.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = cartService.getCart("session-1", "customer@babyshop.local");

        assertThat(userCart.getSessionId()).isEqualTo("session-1");
        assertThat(response.sessionId()).isEqualTo("session-1");
    }

    @Test
    void shouldMergeGuestCartIntoAuthenticatedUsersCart() {
        Cart sessionCart = buildCart();
        sessionCart.setId(2L);
        sessionCart.setSessionId("session-1");

        Cart userCart = buildCart();
        userCart.setSessionId("older-session");
        UserAccount user = buildUser(10L, "customer@babyshop.local");
        userCart.setUser(user);

        ProductVariant sessionVariant = buildVariant(10L, 12, true, true);
        ProductVariant userVariant = buildVariant(11L, 12, true, true);

        CartItem sessionItem = new CartItem();
        sessionItem.setId(20L);
        sessionItem.setCart(sessionCart);
        sessionItem.setProductVariant(sessionVariant);
        sessionItem.setQuantity(2);
        sessionCart.getItems().add(sessionItem);

        CartItem userItem = new CartItem();
        userItem.setId(21L);
        userItem.setCart(userCart);
        userItem.setProductVariant(userVariant);
        userItem.setQuantity(1);
        userCart.getItems().add(userItem);

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(sessionCart));
        given(cartRepository.findByUserEmailIgnoreCaseAndStatus("customer@babyshop.local", "ACTIVE"))
                .willReturn(Optional.of(userCart));
        given(cartRepository.save(any(Cart.class))).willAnswer(invocation -> invocation.getArgument(0));

        var response = cartService.getCart("session-1", "customer@babyshop.local");

        verify(cartRepository).delete(sessionCart);
        verify(cartRepository).flush();
        assertThat(userCart.getItems()).hasSize(2);
        assertThat(userCart.getSessionId()).isEqualTo("session-1");
        assertThat(response.totalQuantity()).isEqualTo(3);
    }

    @Test
    void shouldRejectAuthenticatedUserAccessToAnotherUsersCart() {
        Cart cart = buildCart();
        cart.setUser(buildUser(99L, "someone-else@babyshop.local"));
        UserAccount user = buildUser(10L, "customer@babyshop.local");

        given(userAccountRepository.findByEmailIgnoreCase("customer@babyshop.local")).willReturn(Optional.of(user));
        given(cartRepository.findBySessionId("session-1")).willReturn(Optional.of(cart));
        given(cartRepository.findByUserEmailIgnoreCaseAndStatus("customer@babyshop.local", "ACTIVE"))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.getCart("session-1", "customer@babyshop.local"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Cart session id does not belong to authenticated user: session-1");
    }

    private Cart buildCart() {
        Cart cart = new Cart();
        cart.setId(1L);
        cart.setSessionId("session-1");
        cart.setStatus("ACTIVE");
        cart.setItems(new ArrayList<>());
        return cart;
    }

    private UserAccount buildUser(Long id, String email) {
        UserAccount user = new UserAccount();
        user.setId(id);
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setActive(true);
        return user;
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
