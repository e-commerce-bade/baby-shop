package com.babyshop.order;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.order.dto.CreateOrderRequest;
import com.babyshop.order.dto.OrderAddressRequest;
import com.babyshop.order.dto.OrderItemResponse;
import com.babyshop.order.dto.OrderResponse;
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
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import(OrderControllerTest.TestConfig.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnOrderByOrderNumber() throws Exception {
        given(orderService.getOrderByOrderNumber("ORD-ABC123DEF456")).willReturn(sampleOrderResponse());

        mockMvc.perform(get("/api/v1/orders/ORD-ABC123DEF456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value("ORD-ABC123DEF456"))
                .andExpect(jsonPath("$.items[0].quantity").value(2));
    }

    @Test
    void shouldCreateOrder() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest(
                "session-1",
                "customer@example.com",
                "Ceren",
                "Yilmaz",
                "5551112233",
                null,
                addressRequest(),
                "Please ring the bell"
        );

        given(orderService.createOrder(any(CreateOrderRequest.class), any())).willReturn(sampleOrderResponse());

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderNumber").exists())
                .andExpect(jsonPath("$.totalAmount").value(998.00));
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest("", "bad-email", null, null, null, null, null, null);

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturnBadRequestForInvalidCart() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest(
                "session-1",
                "customer@example.com",
                "Ceren",
                "Yilmaz",
                "5551112233",
                null,
                addressRequest(),
                null
        );

        given(orderService.createOrder(any(CreateOrderRequest.class), any()))
                .willThrow(new InvalidRequestException("Cart is empty for session id: session-1"));

        mockMvc.perform(post("/api/v1/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cart is empty for session id: session-1"));
    }

    @Test
    void shouldReturnNotFoundForMissingOrder() throws Exception {
        given(orderService.getOrderByOrderNumber("ORD-MISSING"))
                .willThrow(new com.babyshop.common.exception.ResourceNotFoundException("Order not found for order number: ORD-MISSING"));

        mockMvc.perform(get("/api/v1/orders/ORD-MISSING"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Order not found for order number: ORD-MISSING"));
    }

    private OrderResponse sampleOrderResponse() {
        return new OrderResponse(
                1L,
                "ORD-ABC123DEF456",
                "PENDING_PAYMENT",
                "customer@example.com",
                "Ceren",
                "Yilmaz",
                "5551112233",
                new BigDecimal("998.00"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("998.00"),
                "TRY",
                OffsetDateTime.parse("2026-06-01T12:00:00+03:00"),
                new com.babyshop.order.dto.OrderAddressResponse(
                        "Ataturk Cd. No:10",
                        "Daire 5",
                        "Kadikoy",
                        "Istanbul",
                        "34710",
                        "Turkey"
                ),
                new com.babyshop.order.dto.OrderPaymentSummaryResponse(
                        "MOCK",
                        "SUCCEEDED",
                        "txn-123",
                        "mock-ref-123",
                        OffsetDateTime.parse("2026-06-01T12:05:00+03:00")
                ),
                "Please ring the bell",
                List.of(new OrderItemResponse(
                        10L,
                        1L,
                        5L,
                        "Baby Dress",
                        "6-9 months / Pink",
                        "SKU-1",
                        2,
                        new BigDecimal("499.00"),
                        new BigDecimal("998.00"),
                        "TRY"
                ))
        );
    }

    private OrderAddressRequest addressRequest() {
        return new OrderAddressRequest(
                "Ataturk Cd. No:10",
                "Daire 5",
                "Kadikoy",
                "Istanbul",
                "34710",
                "Turkey"
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
