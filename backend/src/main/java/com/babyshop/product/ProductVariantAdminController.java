package com.babyshop.product;

import com.babyshop.product.dto.ProductVariantAdminRequest;
import com.babyshop.product.dto.ProductVariantResponse;
import com.babyshop.product.dto.ProductVariantStockUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/products/{productId}/variants")
@RequiredArgsConstructor
public class ProductVariantAdminController {

    private final ProductVariantService productVariantService;

    @GetMapping
    public ResponseEntity<List<ProductVariantResponse>> getProductVariants(@PathVariable Long productId) {
        return ResponseEntity.ok(productVariantService.getProductVariants(productId));
    }

    @PostMapping
    public ResponseEntity<ProductVariantResponse> createProductVariant(
            @PathVariable Long productId,
            @Valid @RequestBody ProductVariantAdminRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productVariantService.createProductVariant(productId, request));
    }

    @PutMapping("/{variantId}")
    public ResponseEntity<ProductVariantResponse> updateProductVariant(
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @Valid @RequestBody ProductVariantAdminRequest request
    ) {
        return ResponseEntity.ok(productVariantService.updateProductVariant(productId, variantId, request));
    }

    @PatchMapping("/{variantId}/stock")
    public ResponseEntity<ProductVariantResponse> updateProductVariantStock(
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @Valid @RequestBody ProductVariantStockUpdateRequest request
    ) {
        return ResponseEntity.ok(
                productVariantService.updateProductVariantStock(productId, variantId, request.stockQuantity())
        );
    }

    @DeleteMapping("/{variantId}")
    public ResponseEntity<Void> deleteProductVariant(@PathVariable Long productId, @PathVariable Long variantId) {
        productVariantService.deleteProductVariant(productId, variantId);
        return ResponseEntity.noContent().build();
    }
}
