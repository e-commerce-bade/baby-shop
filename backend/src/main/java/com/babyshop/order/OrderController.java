package com.babyshop.order;

import com.babyshop.order.dto.CreateOrderRequest;
import com.babyshop.order.dto.GuestOrderResponse;
import com.babyshop.order.dto.OrderLookupRequest;
import com.babyshop.order.dto.OrderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/{orderNumber}")
    public ResponseEntity<OrderResponse> getOrderByOrderNumber(
            @PathVariable String orderNumber,
            Authentication authentication
    ) {
        return ResponseEntity.ok(orderService.getOrderByOrderNumber(
                orderNumber,
                authentication != null ? authentication.getName() : null
        ));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request, authentication != null ? authentication.getName() : null));
    }

    // Misafir siparis takibi: kimlik dogrulama gerektirmez; siparis no + e-posta birlikte dogrulanir.
    @PostMapping("/lookup")
    public ResponseEntity<GuestOrderResponse> lookupOrder(@Valid @RequestBody OrderLookupRequest request) {
        return ResponseEntity.ok(
                orderService.getOrderByOrderNumberAndEmail(request.orderNumber(), request.email())
        );
    }
}
