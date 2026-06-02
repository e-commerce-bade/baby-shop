package com.babyshop.product;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductDetailResponse;
import com.babyshop.product.dto.ProductImageResponse;
import com.babyshop.product.dto.ProductSummaryResponse;
import com.babyshop.product.dto.ProductVariantResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@Import(ProductControllerTest.TestConfig.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @Test
    void shouldReturnProducts() throws Exception {
        given(productService.getActiveProducts(null)).willReturn(List.of(
                new ProductSummaryResponse(
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
                        "https://cdn.example.com/dress.jpg",
                        List.of(new ProductVariantResponse(10L, "SKU-1", "6-9 months", "Pink", 12, new BigDecimal("499.00"), "TRY", true))
                )
        ));

        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("baby-dress"))
                .andExpect(jsonPath("$[0].minPrice").value(499.00));
    }

    @Test
    void shouldFilterProductsByCategorySlug() throws Exception {
        given(productService.getActiveProducts("dresses")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/products").param("categorySlug", "dresses"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldReturnProductBySlug() throws Exception {
        given(productService.getActiveProductBySlug("baby-dress")).willReturn(
                new ProductDetailResponse(
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
                )
        );

        mockMvc.perform(get("/api/v1/products/baby-dress"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images[0].imageUrl").value("https://cdn.example.com/dress.jpg"))
                .andExpect(jsonPath("$.variants[0].colorName").value("Pink"));
    }

    @Test
    void shouldReturnNotFoundForMissingProduct() throws Exception {
        given(productService.getActiveProductBySlug("missing"))
                .willThrow(new ResourceNotFoundException("Product not found for slug: missing"));

        mockMvc.perform(get("/api/v1/products/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found for slug: missing"));
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
