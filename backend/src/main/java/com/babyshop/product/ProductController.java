package com.babyshop.product;

import com.babyshop.common.response.PageResponse;
import com.babyshop.product.dto.ProductDetailResponse;
import com.babyshop.product.dto.ProductSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductSummaryResponse>> getProducts(
            @RequestParam(required = false) String categorySlug
    ) {
        return ResponseEntity.ok(productService.getActiveProducts(categorySlug));
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> searchProducts(
            @RequestParam(required = false) String categorySlug,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String productTypes,
            @RequestParam(required = false) String colors,
            @RequestParam(required = false) String sizes,
            @RequestParam(required = false) String price,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(productService.searchActiveProducts(
                categorySlug, q, productTypes, colors, sizes, price, sort, page, size));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProductDetailResponse> getProductBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(productService.getActiveProductBySlug(slug));
    }
}
