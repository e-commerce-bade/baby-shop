package com.babyshop.category;

import com.babyshop.category.dto.CategoryAdminRequest;
import com.babyshop.category.dto.CategoryResponse;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
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
import static org.mockito.BDDMockito.doNothing;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CategoryAdminController.class)
@Import(CategoryAdminControllerTest.TestConfig.class)
class CategoryAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CategoryService categoryService;

    @Test
    void shouldReturnAllCategoriesForAdmin() throws Exception {
        given(categoryService.getAllCategoriesForAdmin()).willReturn(List.of(
                new CategoryResponse(1L, null, "Newborn", "newborn", "Newborn clothing", true, 1),
                new CategoryResponse(2L, 1L, "Dresses", "dresses", "Baby girl dresses", false, 2)
        ));

        mockMvc.perform(get("/api/v1/admin/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].active").value(false));
    }

    @Test
    void shouldCreateCategory() throws Exception {
        CategoryAdminRequest request = new CategoryAdminRequest(null, "Outerwear", "outerwear", "Outerwear", true, 3);
        given(categoryService.createCategory(any(CategoryAdminRequest.class)))
                .willReturn(new CategoryResponse(3L, null, "Outerwear", "outerwear", "Outerwear", true, 3));

        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3L))
                .andExpect(jsonPath("$.slug").value("outerwear"));
    }

    @Test
    void shouldUpdateCategory() throws Exception {
        CategoryAdminRequest request = new CategoryAdminRequest(1L, "Party Dresses", "party-dresses", "Updated", true, 4);
        given(categoryService.updateCategory(any(Long.class), any(CategoryAdminRequest.class)))
                .willReturn(new CategoryResponse(2L, 1L, "Party Dresses", "party-dresses", "Updated", true, 4));

        mockMvc.perform(put("/api/v1/admin/categories/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Party Dresses"));
    }

    @Test
    void shouldSoftDeleteCategory() throws Exception {
        doNothing().when(categoryService).deleteCategory(2L);

        mockMvc.perform(delete("/api/v1/admin/categories/2"))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnConflictForDuplicateSlug() throws Exception {
        CategoryAdminRequest request = new CategoryAdminRequest(null, "Outerwear", "outerwear", "Outerwear", true, 3);
        given(categoryService.createCategory(any(CategoryAdminRequest.class)))
                .willThrow(new DuplicateResourceException("Category slug already exists: outerwear"));

        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void shouldReturnBadRequestForInvalidParentSelection() throws Exception {
        CategoryAdminRequest request = new CategoryAdminRequest(2L, "Outerwear", "outerwear", "Outerwear", true, 3);
        given(categoryService.updateCategory(any(Long.class), any(CategoryAdminRequest.class)))
                .willThrow(new InvalidRequestException("Category cannot be its own parent"));

        mockMvc.perform(put("/api/v1/admin/categories/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Category cannot be its own parent"));
    }

    @Test
    void shouldReturnValidationErrorForInvalidRequest() throws Exception {
        CategoryAdminRequest request = new CategoryAdminRequest(null, "", "", "Outerwear", true, -1);

        mockMvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void shouldReturnNotFoundForMissingCategory() throws Exception {
        given(categoryService.getCategoryById(99L))
                .willThrow(new ResourceNotFoundException("Category not found for id: 99"));

        mockMvc.perform(get("/api/v1/admin/categories/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Category not found for id: 99"));
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
