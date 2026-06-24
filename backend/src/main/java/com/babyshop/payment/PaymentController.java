package com.babyshop.payment;

import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.payment.dto.PaymentCallbackResponse;
import com.babyshop.payment.dto.PaymentInitiationRequest;
import com.babyshop.payment.dto.PaymentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

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

    @PostMapping(
            value = "/callbacks/{provider}",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<PaymentCallbackResponse> processCallback(
            @PathVariable String provider,
            @Valid @RequestBody PaymentCallbackRequest request
    ) {
        return ResponseEntity.ok(paymentService.processCallback(provider, request));
    }

    @PostMapping(
            value = "/callbacks/{provider}",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE
    )
    public RedirectView processFormCallback(
            @PathVariable String provider,
            @RequestParam MultiValueMap<String, String> form
    ) {
        PaymentCallbackRequest request = new PaymentCallbackRequest(
                first(form, "transactionId"),
                firstNonBlank(first(form, "providerReference"), first(form, "token")),
                first(form, "status"),
                first(form, "signature"),
                form.toString()
        );

        return new RedirectView(paymentService.processCallbackAndResolveRedirect(provider, request));
    }

    private String first(MultiValueMap<String, String> form, String key) {
        return form.getFirst(key);
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary == null || primary.isBlank() ? fallback : primary;
    }
}
