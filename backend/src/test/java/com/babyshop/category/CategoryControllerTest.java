package com.babyshop.category;

import com.babyshop.category.dto.CategoryResponse;
import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CategoryController.class)
@Import(CategoryControllerTest.TestConfig.class)
class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CategoryService categoryService;

    @Test
    void shouldReturnActiveCategories() throws Exception {
        given(categoryService.getActiveCategories()).willReturn(List.of(
                new CategoryResponse(1L, null, "Newborn", "newborn", "Newborn clothing", true, 1),
                new CategoryResponse(2L, 1L, "Dresses", "dresses", "Baby girl dresses", true, 2)
        ));

        mockMvc.perform(get("/api/v1/categories").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("newborn"))
                .andExpect(jsonPath("$[1].parentId").value(1L));
    }

    @Test
    void shouldReturnCategoryBySlug() throws Exception {
        given(categoryService.getActiveCategoryBySlug("newborn"))
                .willReturn(new CategoryResponse(1L, null, "Newborn", "newborn", "Newborn clothing", true, 1));

        mockMvc.perform(get("/api/v1/categories/newborn").accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Newborn"));
    }

    @Test
    void shouldReturnNotFoundWhenCategoryMissing() throws Exception {
        given(categoryService.getActiveCategoryBySlug("missing"))
                .willThrow(new ResourceNotFoundException("Category not found for slug: missing"));

        mockMvc.perform(get("/api/v1/categories/missing").accept(APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Category not found for slug: missing"))
                .andExpect(jsonPath("$.status").value(404));
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
