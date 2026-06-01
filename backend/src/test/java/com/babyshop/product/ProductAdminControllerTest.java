package com.babyshop.product;

import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductAdminRequest;
import com.babyshop.product.dto.ProductDetailResponse;
import com.babyshop.product.dto.ProductImageResponse;
import com.babyshop.product.dto.ProductSummaryResponse;
import com.babyshop.product.dto.ProductVariantResponse;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductAdminController.class)
@Import(ProductAdminControllerTest.TestConfig.class)
class ProductAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    @Test
    void shouldReturnProductsForAdmin() throws Exception {
        given(productService.getAllProductsForAdmin()).willReturn(List.of(
                new ProductSummaryResponse(
                        1L, "Baby Dress", "baby-dress", "Soft cotton dress", "Baby Shop", false,
                        "Dresses", "dresses", new BigDecimal("499.00"), "TRY", null, List.of()
                )
        ));

        mockMvc.perform(get("/api/v1/admin/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].active").value(false));
    }

    @Test
    void shouldReturnProductById() throws Exception {
        given(productService.getProductById(1L)).willReturn(productDetail());

        mockMvc.perform(get("/api/v1/admin/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("baby-dress"));
    }

    @Test
    void shouldCreateProduct() throws Exception {
        ProductAdminRequest request = new ProductAdminRequest(1L, "Baby Dress", "baby-dress", "Soft cotton dress", "Baby Shop", true);
        given(productService.createProduct(any(ProductAdminRequest.class))).willReturn(productDetail());

        mockMvc.perform(post("/api/v1/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Baby Dress"));
    }

    @Test
    void shouldUpdateProduct() throws Exception {
        ProductAdminRequest request = new ProductAdminRequest(1L, "Baby Dress Updated", "baby-dress", "Updated", "Baby Shop", true);
        given(productService.updateProduct(anyLong(), any(ProductAdminRequest.class))).willReturn(
                new ProductDetailResponse(
                        1L, "Baby Dress Updated", "baby-dress", "Updated", "Baby Shop", true,
                        "Dresses", "dresses", new BigDecimal("499.00"), "TRY", List.of(), List.of()
                )
        );

        mockMvc.perform(put("/api/v1/admin/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Baby Dress Updated"));
    }

    @Test
    void shouldSoftDeleteProduct() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/v1/admin/products/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnConflictForDuplicateSlug() throws Exception {
        ProductAdminRequest request = new ProductAdminRequest(1L, "Baby Dress", "baby-dress", "Soft cotton dress", "Baby Shop", true);
        given(productService.createProduct(any(ProductAdminRequest.class)))
                .willThrow(new DuplicateResourceException("Product slug already exists: baby-dress"));

        mockMvc.perform(post("/api/v1/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void shouldReturnNotFoundForMissingProduct() throws Exception {
        given(productService.getProductById(99L))
                .willThrow(new ResourceNotFoundException("Product not found for id: 99"));

        mockMvc.perform(get("/api/v1/admin/products/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found for id: 99"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        ProductAdminRequest request = new ProductAdminRequest(null, "", "", "desc", "Baby Shop", null);

        mockMvc.perform(post("/api/v1/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private ProductDetailResponse productDetail() {
        return new ProductDetailResponse(
                1L,
                "Baby Dress",
                "baby-dress",
                "Soft cotton dress",
                "Baby Shop",
                true,
                "Dresses",
                "dresses",
                new BigDecimal("499.00"),
                "TRY",
                List.of(new ProductImageResponse(100L, "https://cdn.example.com/dress.jpg", "Dress", 1, true)),
                List.of(new ProductVariantResponse(10L, "SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true))
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
