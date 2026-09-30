package com.babyshop.search;

import com.babyshop.customer.CustomerAdminService;
import com.babyshop.customer.dto.CustomerSummaryResponse;
import com.babyshop.order.OrderService;
import com.babyshop.product.ProductService;
import com.babyshop.product.dto.ProductSummaryResponse;
import com.babyshop.search.dto.AdminSearchResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AdminSearchServiceTest {

    @Mock
    private OrderService orderService;

    @Mock
    private ProductService productService;

    @Mock
    private CustomerAdminService customerAdminService;

    @InjectMocks
    private AdminSearchService adminSearchService;

    @Test
    void shouldSearchOrdersProductsAndCustomersWithTheSameText() {
        ProductSummaryResponse product = new ProductSummaryResponse(
                7L, "Garnili Kız Takım", "garnili-kiz-takim", null, null, "Takım", true,
                "Kız Çocuk", "kiz-cocuk", new BigDecimal("996.00"), "TRY", null, List.of());
        CustomerSummaryResponse customer = new CustomerSummaryResponse(
                3L, "ayse@ornek.test", "Ayşe", "Işık", null, true, 2, new BigDecimal("1200.00"), "TRY", null, null);
        given(orderService.searchOrdersForAdmin("ayşe", 5)).willReturn(List.of());
        given(productService.searchProductsForAdmin("ayşe", 5)).willReturn(List.of(product));
        given(customerAdminService.searchCustomers("ayşe", 5)).willReturn(List.of(customer));

        AdminSearchResponse response = adminSearchService.search("  ayşe ");

        assertThat(response.orders()).isEmpty();
        assertThat(response.products()).containsExactly(product);
        assertThat(response.customers()).containsExactly(customer);
    }

    @Test
    void shouldNotQueryForBlankOrSingleCharacterText() {
        assertThat(adminSearchService.search(null).products()).isEmpty();
        assertThat(adminSearchService.search(" a ").orders()).isEmpty();

        verifyNoInteractions(orderService, productService, customerAdminService);
    }
}
