package com.babyshop.product;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductImageAdminRequest;
import com.babyshop.product.dto.ProductImageResponse;
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

@WebMvcTest(ProductImageAdminController.class)
@Import(ProductImageAdminControllerTest.TestConfig.class)
class ProductImageAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductImageService productImageService;

    @Test
    void shouldReturnProductImages() throws Exception {
        given(productImageService.getProductImages(1L)).willReturn(List.of(
                new ProductImageResponse(100L, "https://cdn.example.com/1.jpg", "Image 1", 1, true),
                new ProductImageResponse(101L, "https://cdn.example.com/2.jpg", "Image 2", 2, false)
        ));

        mockMvc.perform(get("/api/v1/admin/products/1/images"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].primary").value(true));
    }

    @Test
    void shouldCreateProductImage() throws Exception {
        ProductImageAdminRequest request = new ProductImageAdminRequest("https://cdn.example.com/1.jpg", "Image 1", 1, true);
        given(productImageService.createProductImage(anyLong(), any(ProductImageAdminRequest.class)))
                .willReturn(new ProductImageResponse(100L, "https://cdn.example.com/1.jpg", "Image 1", 1, true));

        mockMvc.perform(post("/api/v1/admin/products/1/images")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100L));
    }

    @Test
    void shouldUpdateProductImage() throws Exception {
        ProductImageAdminRequest request = new ProductImageAdminRequest("https://cdn.example.com/updated.jpg", "Updated", 2, false);
        given(productImageService.updateProductImage(anyLong(), anyLong(), any(ProductImageAdminRequest.class)))
                .willReturn(new ProductImageResponse(100L, "https://cdn.example.com/updated.jpg", "Updated", 2, false));

        mockMvc.perform(put("/api/v1/admin/products/1/images/100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sortOrder").value(2));
    }

    @Test
    void shouldDeleteProductImage() throws Exception {
        doNothing().when(productImageService).deleteProductImage(1L, 100L);

        mockMvc.perform(delete("/api/v1/admin/products/1/images/100"))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnNotFoundForMissingImage() throws Exception {
        given(productImageService.updateProductImage(anyLong(), anyLong(), any(ProductImageAdminRequest.class)))
                .willThrow(new ResourceNotFoundException("Product image not found for product id: 1 and image id: 100"));

        ProductImageAdminRequest request = new ProductImageAdminRequest("https://cdn.example.com/x.jpg", "Image", 1, false);

        mockMvc.perform(put("/api/v1/admin/products/1/images/100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product image not found for product id: 1 and image id: 100"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidImageRequest() throws Exception {
        ProductImageAdminRequest request = new ProductImageAdminRequest("", "Image", null, null);

        mockMvc.perform(post("/api/v1/admin/products/1/images")
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
