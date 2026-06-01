package com.babyshop.product;

import com.babyshop.product.dto.ProductImageAdminRequest;
import com.babyshop.product.dto.ProductImageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/products/{productId}/images")
@RequiredArgsConstructor
public class ProductImageAdminController {

    private final ProductImageService productImageService;

    @GetMapping
    public ResponseEntity<List<ProductImageResponse>> getProductImages(@PathVariable Long productId) {
        return ResponseEntity.ok(productImageService.getProductImages(productId));
    }

    @PostMapping
    public ResponseEntity<ProductImageResponse> createProductImage(
            @PathVariable Long productId,
            @Valid @RequestBody ProductImageAdminRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productImageService.createProductImage(productId, request));
    }

    @PutMapping("/{imageId}")
    public ResponseEntity<ProductImageResponse> updateProductImage(
            @PathVariable Long productId,
            @PathVariable Long imageId,
            @Valid @RequestBody ProductImageAdminRequest request
    ) {
        return ResponseEntity.ok(productImageService.updateProductImage(productId, imageId, request));
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> deleteProductImage(@PathVariable Long productId, @PathVariable Long imageId) {
        productImageService.deleteProductImage(productId, imageId);
        return ResponseEntity.noContent().build();
    }
}
