package com.babyshop.customer;

import com.babyshop.common.exception.GlobalExceptionHandler;
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
        given(customerProfileService.getOrders("customer@babyshop.local")).willReturn(List.of(
                new OrderResponse(
                        1L, "ORD-ABC123DEF456", "PAID", "customer@babyshop.local", "Ceren", "Unlu", "5551112233",
                        new BigDecimal("499.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("499.00"), "TRY",
                        new OrderAddressResponse("Ataturk Cd. No:10", null, "Kadikoy", "Istanbul", "34710", "Turkey"),
                        null, List.of()
                )
        ));

        mockMvc.perform(get("/api/v1/me/orders")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].orderNumber").value("ORD-ABC123DEF456"));
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
