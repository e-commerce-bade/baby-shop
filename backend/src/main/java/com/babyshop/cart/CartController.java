package com.babyshop.cart;

import com.babyshop.cart.dto.CartItemQuantityUpdateRequest;
import com.babyshop.cart.dto.CartItemRequest;
import com.babyshop.cart.dto.CartResponse;
import com.babyshop.cart.dto.CheckoutSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/carts/{sessionId}")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@PathVariable String sessionId, Authentication authentication) {
        return ResponseEntity.ok(cartService.getCart(sessionId, extractAuthenticatedEmail(authentication)));
    }

    @GetMapping("/checkout")
    public ResponseEntity<CheckoutSummaryResponse> getCheckoutSummary(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(cartService.getCheckoutSummary(sessionId, extractAuthenticatedEmail(authentication)));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addCartItem(
            @PathVariable String sessionId,
            @Valid @RequestBody CartItemRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cartService.addCartItem(
                        sessionId,
                        request.productVariantId(),
                        request.quantity(),
                        extractAuthenticatedEmail(authentication)
                ));
    }

    @PatchMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> updateCartItemQuantity(
            @PathVariable String sessionId,
            @PathVariable Long itemId,
            @Valid @RequestBody CartItemQuantityUpdateRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(cartService.updateCartItemQuantity(
                sessionId,
                itemId,
                request.quantity(),
                extractAuthenticatedEmail(authentication)
        ));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> removeCartItem(
            @PathVariable String sessionId,
            @PathVariable Long itemId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(cartService.removeCartItem(sessionId, itemId, extractAuthenticatedEmail(authentication)));
    }

    private String extractAuthenticatedEmail(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }
}
