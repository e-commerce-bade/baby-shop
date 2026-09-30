package com.babyshop.search.dto;

import com.babyshop.customer.dto.CustomerSummaryResponse;
import com.babyshop.order.dto.OrderResponse;
import com.babyshop.product.dto.ProductSummaryResponse;

import java.util.List;

/** Admin panelindeki genel arama kutusunun sonucu: her turden en yakin birkac kayit. */
public record AdminSearchResponse(
        List<OrderResponse> orders,
        List<ProductSummaryResponse> products,
        List<CustomerSummaryResponse> customers
) {
}
