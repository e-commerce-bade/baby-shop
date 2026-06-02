package com.babyshop.order;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.common.response.PageResponse;
import com.babyshop.order.dto.OrderAddressResponse;
import com.babyshop.order.dto.OrderItemResponse;
import com.babyshop.order.dto.OrderResponse;
import com.babyshop.order.dto.OrderStatusUpdateRequest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderAdminController.class)
@Import(OrderAdminControllerTest.TestConfig.class)
class OrderAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnAllOrders() throws Exception {
        given(orderService.getAllOrders(0, 10, null, null, null, null)).willReturn(new PageResponse<>(
                List.of(sampleOrderResponse("ORD-ABC123DEF456", "PENDING_PAYMENT")),
                0,
                10,
                1,
                1,
                false,
                false
        ));

        mockMvc.perform(get("/api/v1/admin/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].orderNumber").value("ORD-ABC123DEF456"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void shouldReturnFilteredOrdersByOrderNumber() throws Exception {
        given(orderService.getAllOrders(0, 10, "ABC123", null, null, null)).willReturn(new PageResponse<>(
                List.of(sampleOrderResponse("ORD-ABC123DEF456", "PENDING_PAYMENT")),
                0,
                10,
                1,
                1,
                false,
                false
        ));

        mockMvc.perform(get("/api/v1/admin/orders?orderNumber=ABC123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].orderNumber").value("ORD-ABC123DEF456"));
    }

    @Test
    void shouldReturnOrderDetail() throws Exception {
        given(orderService.getOrderByOrderNumber("ORD-ABC123DEF456"))
                .willReturn(sampleOrderResponse("ORD-ABC123DEF456", "PENDING_PAYMENT"));

        mockMvc.perform(get("/api/v1/admin/orders/ORD-ABC123DEF456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value("ORD-ABC123DEF456"));
    }

    @Test
    void shouldUpdateOrderStatus() throws Exception {
        OrderStatusUpdateRequest request = new OrderStatusUpdateRequest("SHIPPED");
        given(orderService.updateOrderStatus("ORD-ABC123DEF456", request))
                .willReturn(sampleOrderResponse("ORD-ABC123DEF456", "SHIPPED"));

        mockMvc.perform(patch("/api/v1/admin/orders/ORD-ABC123DEF456/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidStatusRequest() throws Exception {
        OrderStatusUpdateRequest request = new OrderStatusUpdateRequest("");

        mockMvc.perform(patch("/api/v1/admin/orders/ORD-ABC123DEF456/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturnValidationErrorForInvalidOrderPageSize() throws Exception {
        mockMvc.perform(get("/api/v1/admin/orders?size=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturnNotFoundForMissingOrder() throws Exception {
        given(orderService.getOrderByOrderNumber("ORD-MISSING"))
                .willThrow(new ResourceNotFoundException("Order not found for order number: ORD-MISSING"));

        mockMvc.perform(get("/api/v1/admin/orders/ORD-MISSING"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Order not found for order number: ORD-MISSING"));
    }

    @Test
    void shouldReturnBadRequestForUnsupportedStatus() throws Exception {
        OrderStatusUpdateRequest request = new OrderStatusUpdateRequest("INVALID_STATUS");
        given(orderService.updateOrderStatus(any(), any(OrderStatusUpdateRequest.class)))
                .willThrow(new InvalidRequestException("Unsupported order status: INVALID_STATUS"));

        mockMvc.perform(patch("/api/v1/admin/orders/ORD-ABC123DEF456/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unsupported order status: INVALID_STATUS"));
    }

    private OrderResponse sampleOrderResponse(String orderNumber, String status) {
        return new OrderResponse(
                1L,
                orderNumber,
                status,
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
                new OrderAddressResponse(
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

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
