package com.babyshop.cart;

import com.babyshop.cart.dto.CartItemQuantityUpdateRequest;
import com.babyshop.cart.dto.CartItemRequest;
import com.babyshop.cart.dto.CartItemResponse;
import com.babyshop.cart.dto.CartResponse;
import com.babyshop.cart.dto.CheckoutSummaryResponse;
import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.InvalidRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CartController.class)
@Import(CartControllerTest.TestConfig.class)
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CartService cartService;

    @Test
    void shouldReturnCart() throws Exception {
        given(cartService.getCart("session-1", null)).willReturn(sampleCartResponse(2, new BigDecimal("998.00")));

        mockMvc.perform(get("/api/v1/carts/session-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value("session-1"))
                .andExpect(jsonPath("$.totalQuantity").value(2));
    }

    @Test
    void shouldReturnCheckoutSummary() throws Exception {
        given(cartService.getCheckoutSummary("session-1", null)).willReturn(sampleCheckoutSummaryResponse(2, new BigDecimal("998.00")));

        mockMvc.perform(get("/api/v1/carts/session-1/checkout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readyForCheckout").value(true))
                .andExpect(jsonPath("$.totalAmount").value(998.00))
                .andExpect(jsonPath("$.defaultShippingAddress").doesNotExist());
    }

    @Test
    void shouldReturnCheckoutSummaryWithDefaultAddressForAuthenticatedUser() throws Exception {
        given(cartService.getCheckoutSummary("session-1", "customer@babyshop.local"))
                .willReturn(sampleCheckoutSummaryResponseWithDefaultAddress(2, new BigDecimal("998.00")));

        mockMvc.perform(get("/api/v1/carts/session-1/checkout")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultShippingAddress.id").value(20))
                .andExpect(jsonPath("$.defaultShippingAddress.label").value("Home"));
    }

    @Test
    void shouldAddCartItem() throws Exception {
        CartItemRequest request = new CartItemRequest(10L, 2);
        given(cartService.addCartItem("session-1", 10L, 2, null)).willReturn(sampleCartResponse(2, new BigDecimal("998.00")));

        mockMvc.perform(post("/api/v1/carts/session-1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subtotal").value(998.00));
    }

    @Test
    void shouldUpdateCartItemQuantity() throws Exception {
        CartItemQuantityUpdateRequest request = new CartItemQuantityUpdateRequest(1);
        given(cartService.updateCartItemQuantity("session-1", 5L, 1, null)).willReturn(sampleCartResponse(1, new BigDecimal("499.00")));

        mockMvc.perform(patch("/api/v1/carts/session-1/items/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].quantity").value(1));
    }

    @Test
    void shouldRemoveCartItem() throws Exception {
        given(cartService.removeCartItem("session-1", 5L, null)).willReturn(new CartResponse(1L, "session-1", "ACTIVE", List.of(), 0, BigDecimal.ZERO, "TRY"));

        mockMvc.perform(delete("/api/v1/carts/session-1/items/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalQuantity").value(0));
    }

    @Test
    void shouldForwardAuthenticatedUserToCartService() throws Exception {
        given(cartService.getCart("session-1", "customer@babyshop.local"))
                .willReturn(sampleCartResponse(2, new BigDecimal("998.00")));

        mockMvc.perform(get("/api/v1/carts/session-1")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value("session-1"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidCartItemRequest() throws Exception {
        CartItemRequest request = new CartItemRequest(null, 0);

        mockMvc.perform(post("/api/v1/carts/session-1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturnBadRequestWhenStockExceeded() throws Exception {
        given(cartService.addCartItem(anyString(), anyLong(), anyInt(), isNull()))
                .willThrow(new InvalidRequestException("Requested quantity exceeds available stock for variant id: 10"));

        CartItemRequest request = new CartItemRequest(10L, 999);

        mockMvc.perform(post("/api/v1/carts/session-1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Requested quantity exceeds available stock for variant id: 10"));
    }

    @Test
    void shouldReturnBadRequestForEmptyCheckoutSummary() throws Exception {
        given(cartService.getCheckoutSummary("session-1", null))
                .willThrow(new InvalidRequestException("Cart is empty for session id: session-1"));

        mockMvc.perform(get("/api/v1/carts/session-1/checkout"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cart is empty for session id: session-1"));
    }

    private CartResponse sampleCartResponse(int quantity, BigDecimal subtotal) {
        return new CartResponse(
                1L,
                "session-1",
                "ACTIVE",
                List.of(new CartItemResponse(
                        5L,
                        1L,
                        "Baby Dress",
                        "baby-dress",
                        "https://example.com/image-1.jpg",
                        10L,
                        "SKU-1",
                        "6-9 months",
                        "Pink",
                        quantity,
                        new BigDecimal("499.00"),
                        subtotal,
                        "TRY"
                )),
                quantity,
                subtotal,
                "TRY"
        );
    }

    private CheckoutSummaryResponse sampleCheckoutSummaryResponse(int quantity, BigDecimal subtotal) {
        return new CheckoutSummaryResponse(
                1L,
                "session-1",
                List.of(new CartItemResponse(
                        5L,
                        1L,
                        "Baby Dress",
                        "baby-dress",
                        "https://example.com/image-1.jpg",
                        10L,
                        "SKU-1",
                        "6-9 months",
                        "Pink",
                        quantity,
                        new BigDecimal("499.00"),
                        subtotal,
                        "TRY"
                )),
                quantity,
                subtotal,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                subtotal,
                "TRY",
                true,
                null
        );
    }

    private CheckoutSummaryResponse sampleCheckoutSummaryResponseWithDefaultAddress(int quantity, BigDecimal subtotal) {
        return new CheckoutSummaryResponse(
                1L,
                "session-1",
                List.of(new CartItemResponse(
                        5L,
                        1L,
                        "Baby Dress",
                        "baby-dress",
                        "https://example.com/image-1.jpg",
                        10L,
                        "SKU-1",
                        "6-9 months",
                        "Pink",
                        quantity,
                        new BigDecimal("499.00"),
                        subtotal,
                        "TRY"
                )),
                quantity,
                subtotal,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                subtotal,
                "TRY",
                true,
                new com.babyshop.customer.dto.CustomerAddressResponse(
                        20L,
                        "Home",
                        "Ceren",
                        "Yilmaz",
                        "5551112233",
                        "Ataturk Cd. No:10",
                        "Daire 5",
                        "Kadikoy",
                        "Istanbul",
                        "34710",
                        "Turkey",
                        true,
                        null,
                        null
                )
        );
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
