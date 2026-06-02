package com.babyshop.customer;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.customer.dto.CustomerAddressRequest;
import com.babyshop.customer.dto.CustomerAddressResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomerAddressController.class)
@Import(CustomerAddressControllerTest.TestConfig.class)
class CustomerAddressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CustomerAddressService customerAddressService;

    @Test
    void shouldReturnCustomerAddresses() throws Exception {
        given(customerAddressService.getAddresses("customer@babyshop.local"))
                .willReturn(List.of(sampleResponse(1L, true)));

        mockMvc.perform(get("/api/v1/me/addresses")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].defaultAddress").value(true));
    }

    @Test
    void shouldCreateCustomerAddress() throws Exception {
        CustomerAddressRequest request = sampleRequest(true);
        given(customerAddressService.createAddress("customer@babyshop.local", request))
                .willReturn(sampleResponse(1L, true));

        mockMvc.perform(post("/api/v1/me/addresses")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null))
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    void shouldUpdateCustomerAddress() throws Exception {
        CustomerAddressRequest request = sampleRequest(false);
        given(customerAddressService.updateAddress("customer@babyshop.local", 1L, request))
                .willReturn(sampleResponse(1L, false));

        mockMvc.perform(put("/api/v1/me/addresses/1")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null))
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultAddress").value(false));
    }

    @Test
    void shouldDeleteCustomerAddress() throws Exception {
        mockMvc.perform(delete("/api/v1/me/addresses/1")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldSetCustomerDefaultAddress() throws Exception {
        given(customerAddressService.setDefaultAddress("customer@babyshop.local", 1L))
                .willReturn(sampleResponse(1L, true));

        mockMvc.perform(patch("/api/v1/me/addresses/1/default")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.defaultAddress").value(true));
    }

    @Test
    void shouldReturnValidationErrorForInvalidAddressRequest() throws Exception {
        CustomerAddressRequest request = new CustomerAddressRequest(
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                null
        );

        mockMvc.perform(post("/api/v1/me/addresses")
                        .principal(new TestingAuthenticationToken("customer@babyshop.local", null))
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private CustomerAddressRequest sampleRequest(boolean defaultAddress) {
        return new CustomerAddressRequest(
                "Ev",
                "Ceren",
                "Unlu",
                "5551112233",
                "Ataturk Cd. No:10",
                "Daire 5",
                "Kadikoy",
                "Istanbul",
                "34710",
                "Turkey",
                defaultAddress
        );
    }

    private CustomerAddressResponse sampleResponse(Long id, boolean defaultAddress) {
        OffsetDateTime now = OffsetDateTime.now();
        return new CustomerAddressResponse(
                id,
                "Ev",
                "Ceren",
                "Unlu",
                "5551112233",
                "Ataturk Cd. No:10",
                "Daire 5",
                "Kadikoy",
                "Istanbul",
                "34710",
                "Turkey",
                defaultAddress,
                now,
                now
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
