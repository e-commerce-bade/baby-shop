package com.babyshop.payment;

import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.payment.dto.PaymentCallbackResponse;
import com.babyshop.payment.dto.PaymentInitiationRequest;
import com.babyshop.payment.dto.PaymentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponse> initiatePayment(@Valid @RequestBody PaymentInitiationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.initiatePayment(request));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<PaymentResponse> getPaymentByTransactionId(@PathVariable String transactionId) {
        return ResponseEntity.ok(paymentService.getPaymentByTransactionId(transactionId));
    }

    @PatchMapping("/{transactionId}/confirm")
    public ResponseEntity<PaymentResponse> confirmPayment(@PathVariable String transactionId) {
        return ResponseEntity.ok(paymentService.confirmPayment(transactionId));
    }

    @PatchMapping("/{transactionId}/fail")
    public ResponseEntity<PaymentResponse> failPayment(@PathVariable String transactionId) {
        return ResponseEntity.ok(paymentService.failPayment(transactionId));
    }

    @PostMapping("/callbacks/{provider}")
    public ResponseEntity<PaymentCallbackResponse> processCallback(
            @PathVariable String provider,
            @Valid @RequestBody PaymentCallbackRequest request
    ) {
        return ResponseEntity.ok(paymentService.processCallback(provider, request));
    }
}
