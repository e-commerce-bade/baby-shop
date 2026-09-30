package com.babyshop.search;

import com.babyshop.customer.CustomerAdminService;
import com.babyshop.order.OrderService;
import com.babyshop.product.ProductService;
import com.babyshop.search.dto.AdminSearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Admin panelinin ust cubugundaki arama: ayni metni siparislerde (no, musteri adi, e-posta, telefon),
 * urunlerde (ad, marka, tip, SKU) ve kayitli musterilerde arar.
 */
@Service
@RequiredArgsConstructor
public class AdminSearchService {

    private static final int MIN_QUERY_LENGTH = 2;
    private static final int RESULTS_PER_GROUP = 5;

    private final OrderService orderService;
    private final ProductService productService;
    private final CustomerAdminService customerAdminService;

    public AdminSearchResponse search(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.length() < MIN_QUERY_LENGTH) {
            return new AdminSearchResponse(List.of(), List.of(), List.of());
        }

        return new AdminSearchResponse(
                orderService.searchOrdersForAdmin(trimmed, RESULTS_PER_GROUP),
                productService.searchProductsForAdmin(trimmed, RESULTS_PER_GROUP),
                customerAdminService.searchCustomers(trimmed, RESULTS_PER_GROUP)
        );
    }
}
