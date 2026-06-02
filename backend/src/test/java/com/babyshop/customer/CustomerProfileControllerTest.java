package com.babyshop.customer;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.response.PageResponse;
import com.babyshop.customer.dto.CustomerProfileResponse;
import com.babyshop.customer.dto.CustomerProfileUpdateRequest;
import com.babyshop.order.dto.OrderAddressResponse;
import com.babyshop.order.dto.OrderResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomerProfileController.class)
@Import(CustomerProfileControllerTest.TestConfig.class)
class CustomerProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CustomerProfileService customerProfileService;

    @Test
    void shouldReturnAuthenticatedCustomerProfile() throws Exception {
        given(customerProfileService.getProfile("customer@babyshop.local")).willReturn(
                new CustomerProfileResponse(1L, "customer@babyshop.local", "Ceren", "Unlu", "5551112233", true, Set.of("CUSTOMER"))
        );

        mockMvc.perform(get("/api/v1/me")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("customer@babyshop.local"));
    }

    @Test
    void shouldReturnAuthenticatedCustomerOrders() throws Exception {
        given(customerProfileService.getOrders("customer@babyshop.local", 0, 10, null, null, null))
                .willReturn(new PageResponse<>(
                        List.of(new OrderResponse(
                                1L, "ORD-ABC123DEF456", "PAID", "customer@babyshop.local", "Ceren", "Unlu", "5551112233",
                                new BigDecimal("499.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("499.00"), "TRY",
                                OffsetDateTime.parse("2026-06-01T12:00:00+03:00"),
                                new OrderAddressResponse("Ataturk Cd. No:10", null, "Kadikoy", "Istanbul", "34710", "Turkey"),
                                null,
                                null,
                                List.of()
                        )),
                        0,
                        10,
                        1,
                        1,
                        false,
                        false
                ));

        mockMvc.perform(get("/api/v1/me/orders")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].orderNumber").value("ORD-ABC123DEF456"))
                .andExpect(jsonPath("$.content[0].createdAt").value("2026-06-01T12:00:00+03:00"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void shouldReturnValidationErrorForInvalidOrderPageSize() throws Exception {
        mockMvc.perform(get("/api/v1/me/orders?size=0")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldUpdateAuthenticatedCustomerProfile() throws Exception {
        CustomerProfileUpdateRequest request = new CustomerProfileUpdateRequest("Ceren", "Unlu", "5551112233");
        given(customerProfileService.updateProfile("customer@babyshop.local", request)).willReturn(
                new CustomerProfileResponse(1L, "customer@babyshop.local", "Ceren", "Unlu", "5551112233", true, Set.of("CUSTOMER"))
        );

        mockMvc.perform(patch("/api/v1/me")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ceren"))
                .andExpect(jsonPath("$.phoneNumber").value("5551112233"));
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
