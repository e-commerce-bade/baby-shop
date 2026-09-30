package com.babyshop.search;

import com.babyshop.common.exception.GlobalExceptionHandler;
import com.babyshop.product.dto.ProductSummaryResponse;
import com.babyshop.search.dto.AdminSearchResponse;
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

@WebMvcTest(AdminSearchController.class)
@Import(AdminSearchControllerTest.TestConfig.class)
class AdminSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminSearchService adminSearchService;

    @Test
    void shouldReturnGroupedSearchResults() throws Exception {
        given(adminSearchService.search("garnili")).willReturn(new AdminSearchResponse(
                List.of(),
                List.of(new ProductSummaryResponse(
                        7L, "Garnili Kız Takım", "garnili-kiz-takim", null, null, "Takım", true,
                        "Kız Çocuk", "kiz-cocuk", new BigDecimal("996.00"), "TRY", null, List.of())),
                List.of()
        ));

        mockMvc.perform(get("/api/v1/admin/search").param("q", "garnili"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].name").value("Garnili Kız Takım"))
                .andExpect(jsonPath("$.orders").isEmpty())
                .andExpect(jsonPath("$.customers").isEmpty());
    }

    @Test
    void shouldAcceptMissingQuery() throws Exception {
        given(adminSearchService.search(null)).willReturn(new AdminSearchResponse(List.of(), List.of(), List.of()));

        mockMvc.perform(get("/api/v1/admin/search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products").isEmpty());
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        GlobalExceptionHandler globalExceptionHandler() {
            return new GlobalExceptionHandler();
        }
    }
}
