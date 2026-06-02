package com.babyshop.payment;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.payment.dto.PaymentCallbackRequest;
import com.babyshop.payment.dto.PaymentCallbackResponse;
import com.babyshop.payment.dto.PaymentInitiationRequest;
import com.babyshop.payment.dto.PaymentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@Import(PaymentControllerTest.TestConfig.class)
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentService paymentService;

    @Test
    void shouldInitiatePayment() throws Exception {
        PaymentInitiationRequest request = new PaymentInitiationRequest(
                "ORD-ABC123DEF456",
                "MOCK",
                "http://localhost:3000/payment/success",
                "http://localhost:3000/payment/cancel"
        );

        given(paymentService.initiatePayment(any(PaymentInitiationRequest.class))).willReturn(samplePaymentResponse());

        mockMvc.perform(post("/api/v1/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.provider").value("MOCK"))
                .andExpect(jsonPath("$.paymentPageUrl").exists());
    }

    @Test
    void shouldReturnPaymentByTransactionId() throws Exception {
        given(paymentService.getPaymentByTransactionId("TXN-123"))
                .willReturn(samplePaymentResponse());

        mockMvc.perform(get("/api/v1/payments/TXN-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId").value("TXN-123"));
    }

    @Test
    void shouldConfirmPayment() throws Exception {
        given(paymentService.confirmPayment("TXN-123"))
                .willReturn(samplePaymentResponseWithStatus("SUCCEEDED"));

        mockMvc.perform(patch("/api/v1/payments/TXN-123/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCEEDED"));
    }

    @Test
    void shouldFailPayment() throws Exception {
        given(paymentService.failPayment("TXN-123"))
                .willReturn(samplePaymentResponseWithStatus("FAILED"));

        mockMvc.perform(patch("/api/v1/payments/TXN-123/fail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));
    }

    @Test
    void shouldProcessPaymentCallback() throws Exception {
        PaymentCallbackRequest request = new PaymentCallbackRequest(
                "TXN-123",
                null,
                "SUCCEEDED",
                "signed-callback",
                "{\"status\":\"SUCCEEDED\"}"
        );
        given(paymentService.processCallback(any(), any(PaymentCallbackRequest.class)))
                .willReturn(new PaymentCallbackResponse("MOCK", "TXN-123", "SUCCEEDED", "ORD-ABC123DEF456", "PAID", false));

        mockMvc.perform(post("/api/v1/payments/callbacks/MOCK")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("SUCCEEDED"))
                .andExpect(jsonPath("$.orderStatus").value("PAID"))
                .andExpect(jsonPath("$.duplicate").value(false));
    }

    @Test
    void shouldReturnValidationErrorForInvalidInitiationRequest() throws Exception {
        PaymentInitiationRequest request = new PaymentInitiationRequest("", "", "", "");

        mockMvc.perform(post("/api/v1/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturnBadRequestForUnsupportedProvider() throws Exception {
        PaymentInitiationRequest request = new PaymentInitiationRequest(
                "ORD-ABC123DEF456",
                "PAYTR",
                "http://localhost:3000/payment/success",
                "http://localhost:3000/payment/cancel"
        );

        given(paymentService.initiatePayment(any(PaymentInitiationRequest.class)))
                .willThrow(new InvalidRequestException("Unsupported payment provider: PAYTR"));

        mockMvc.perform(post("/api/v1/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported payment provider: PAYTR"));
    }

    @Test
    void shouldReturnNotFoundForMissingPayment() throws Exception {
        given(paymentService.getPaymentByTransactionId("TXN-MISSING"))
                .willThrow(new ResourceNotFoundException("Payment not found for transaction id: TXN-MISSING"));

        mockMvc.perform(get("/api/v1/payments/TXN-MISSING"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Payment not found for transaction id: TXN-MISSING"));
    }

    @Test
    void shouldReturnBadRequestWhenConfirmingFailedPayment() throws Exception {
        given(paymentService.confirmPayment("TXN-FAILED"))
                .willThrow(new InvalidRequestException("Failed payment cannot be confirmed for transaction id: TXN-FAILED"));

        mockMvc.perform(patch("/api/v1/payments/TXN-FAILED/confirm"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Failed payment cannot be confirmed for transaction id: TXN-FAILED"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidCallbackRequest() throws Exception {
        PaymentCallbackRequest request = new PaymentCallbackRequest(null, null, "", null, null);

        mockMvc.perform(post("/api/v1/payments/callbacks/MOCK")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private PaymentResponse samplePaymentResponse() {
        return samplePaymentResponseWithStatus("INITIATED");
    }

    private PaymentResponse samplePaymentResponseWithStatus(String status) {
        return new PaymentResponse(
                1L,
                "ORD-ABC123DEF456",
                "MOCK",
                status,
                new BigDecimal("998.00"),
                "TRY",
                "TXN-123",
                "MOCK-TXN-123",
                "https://mock-payments.local/checkout/TXN-123"
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
