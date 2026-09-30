package com.babyshop.product;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.StockConflictException;
import com.babyshop.product.dto.ProductVariantBulkDeleteRequest;
import com.babyshop.product.dto.ProductVariantBulkUpdateRequest;
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

import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductVariantBulkAdminController.class)
@Import(ProductVariantBulkAdminControllerTest.TestConfig.class)
class ProductVariantBulkAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductVariantService productVariantService;

    @Test
    void shouldUpdateVariantsInBulk() throws Exception {
        ProductVariantBulkUpdateRequest request = new ProductVariantBulkUpdateRequest(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, null, 4, null),
                new ProductVariantBulkUpdateRequest.Item(11L, "6-7 Yaş", null, new BigDecimal("650.00"))
        ));
        given(productVariantService.updateProductVariants(request.variants())).willReturn(List.of(
                new ProductVariantResponse(10L, "SKU-1", "5-6 Yaş", "Haki", 4, new BigDecimal("550.00"), null, "TRY", true),
                new ProductVariantResponse(11L, "SKU-2", "6-7 Yaş", "Haki", 0, new BigDecimal("650.00"), null, "TRY", true)
        ));

        mockMvc.perform(patch("/api/v1/admin/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].stockQuantity").value(4))
                .andExpect(jsonPath("$[1].sizeLabel").value("6-7 Yaş"));
    }

    @Test
    void shouldReturnEveryStockConflictOfABulkUpdate() throws Exception {
        given(productVariantService.updateProductVariants(anyList())).willThrow(new StockConflictException(
                "Siz düzenlerken stok değişti",
                List.of(
                        new StockConflictException.StockConflict(10L, 5, 4),
                        new StockConflictException.StockConflict(11L, 2, 3)
                )
        ));

        mockMvc.perform(patch("/api/v1/admin/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"variants\":[{\"id\":10,\"stockQuantity\":8,\"expectedStockQuantity\":5},"
                                + "{\"id\":11,\"stockQuantity\":0,\"expectedStockQuantity\":2}]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.conflicts.length()").value(2))
                .andExpect(jsonPath("$.conflicts[1].variantId").value(11))
                .andExpect(jsonPath("$.conflicts[1].currentStockQuantity").value(3));

        verify(productVariantService).updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, null, 8, null, 5),
                new ProductVariantBulkUpdateRequest.Item(11L, null, 0, null, 2)
        ));
    }

    @Test
    void shouldReturnValidationErrorForNegativeStockInBulkUpdate() throws Exception {
        ProductVariantBulkUpdateRequest request = new ProductVariantBulkUpdateRequest(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, null, -1, null)
        ));

        mockMvc.perform(patch("/api/v1/admin/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verify(productVariantService, never()).updateProductVariants(anyList());
    }

    @Test
    void shouldReturnValidationErrorForPriceTheColumnCannotStore() throws Exception {
        for (String price : List.of("12.345", "99999999999")) {
            mockMvc.perform(patch("/api/v1/admin/variants")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"variants\":[{\"id\":10,\"price\":" + price + "}]}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }

        verify(productVariantService, never()).updateProductVariants(anyList());
    }

    @Test
    void shouldReturnValidationErrorForEmptyBulkUpdate() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/variants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"variants\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void shouldDeleteVariantsInBulk() throws Exception {
        ProductVariantBulkDeleteRequest request = new ProductVariantBulkDeleteRequest(List.of(10L, 11L));

        mockMvc.perform(post("/api/v1/admin/variants/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(productVariantService).deleteProductVariants(List.of(10L, 11L));
    }

    @Test
    void shouldReturnBadRequestWhenDeleteWouldRemoveEveryVariant() throws Exception {
        ProductVariantBulkDeleteRequest request = new ProductVariantBulkDeleteRequest(List.of(10L));
        willThrow(new InvalidRequestException("\"Takım\" ürününün tüm varyantları silinemez; en az bir varyant kalmalı."))
                .given(productVariantService).deleteProductVariants(anyCollection());

        mockMvc.perform(post("/api/v1/admin/variants/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("\"Takım\" ürününün tüm varyantları silinemez; en az bir varyant kalmalı."));
    }

    @Test
    void shouldReturnValidationErrorForEmptyBulkDelete() throws Exception {
        mockMvc.perform(post("/api/v1/admin/variants/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ids\":[]}"))
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
