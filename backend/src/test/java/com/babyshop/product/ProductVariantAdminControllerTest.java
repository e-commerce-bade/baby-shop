package com.babyshop.product;

import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductVariantAdminRequest;
import com.babyshop.product.dto.ProductVariantResponse;
import com.babyshop.product.dto.ProductVariantStockUpdateRequest;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.doNothing;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductVariantAdminController.class)
@Import(ProductVariantAdminControllerTest.TestConfig.class)
class ProductVariantAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductVariantService productVariantService;

    @Test
    void shouldReturnProductVariants() throws Exception {
        given(productVariantService.getProductVariants(1L)).willReturn(List.of(
                new ProductVariantResponse(10L, "SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true)
        ));

        mockMvc.perform(get("/api/v1/admin/products/1/variants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sku").value("SKU-1"));
    }

    @Test
    void shouldCreateProductVariant() throws Exception {
        ProductVariantAdminRequest request = new ProductVariantAdminRequest("SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true);
        given(productVariantService.createProductVariant(anyLong(), any(ProductVariantAdminRequest.class)))
                .willReturn(new ProductVariantResponse(10L, "SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true));

        mockMvc.perform(post("/api/v1/admin/products/1/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stockQuantity").value(12));
    }

    @Test
    void shouldUpdateProductVariant() throws Exception {
        ProductVariantAdminRequest request = new ProductVariantAdminRequest("SKU-1", "9-12 months", "Pink", 7, new BigDecimal("529.00"), "TRY", true);
        given(productVariantService.updateProductVariant(anyLong(), anyLong(), any(ProductVariantAdminRequest.class)))
                .willReturn(new ProductVariantResponse(10L, "SKU-1", "9-12 months", "Pink", 7, new BigDecimal("529.00"), "TRY", true));

        mockMvc.perform(put("/api/v1/admin/products/1/variants/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price").value(529.00));
    }

    @Test
    void shouldDeleteProductVariant() throws Exception {
        doNothing().when(productVariantService).deleteProductVariant(1L, 10L);

        mockMvc.perform(delete("/api/v1/admin/products/1/variants/10"))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldUpdateProductVariantStock() throws Exception {
        ProductVariantStockUpdateRequest request = new ProductVariantStockUpdateRequest(4);
        given(productVariantService.updateProductVariantStock(1L, 10L, 4))
                .willReturn(new ProductVariantResponse(10L, "SKU-1", "6-9 months", "Pink", 4, new BigDecimal("499.00"), "TRY", true));

        mockMvc.perform(patch("/api/v1/admin/products/1/variants/10/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQuantity").value(4));
    }

    @Test
    void shouldReturnConflictForDuplicateVariant() throws Exception {
        ProductVariantAdminRequest request = new ProductVariantAdminRequest("SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true);
        given(productVariantService.createProductVariant(anyLong(), any(ProductVariantAdminRequest.class)))
                .willThrow(new DuplicateResourceException("Product variant already exists for size/color combination"));

        mockMvc.perform(post("/api/v1/admin/products/1/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void shouldReturnNotFoundForMissingVariant() throws Exception {
        ProductVariantAdminRequest request = new ProductVariantAdminRequest("SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true);
        given(productVariantService.updateProductVariant(anyLong(), anyLong(), any(ProductVariantAdminRequest.class)))
                .willThrow(new ResourceNotFoundException("Product variant not found for product id: 1 and variant id: 10"));

        mockMvc.perform(put("/api/v1/admin/products/1/variants/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product variant not found for product id: 1 and variant id: 10"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidVariantRequest() throws Exception {
        ProductVariantAdminRequest request = new ProductVariantAdminRequest("", "", "", -1, new BigDecimal("-1.00"), "", null);

        mockMvc.perform(post("/api/v1/admin/products/1/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldReturnValidationErrorForInvalidStockUpdateRequest() throws Exception {
        ProductVariantStockUpdateRequest request = new ProductVariantStockUpdateRequest(-1);

        mockMvc.perform(patch("/api/v1/admin/products/1/variants/10/stock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
