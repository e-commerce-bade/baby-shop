package com.babyshop.product;

import com.babyshop.product.dto.ProductVariantBulkDeleteRequest;
import com.babyshop.product.dto.ProductVariantBulkUpdateRequest;
import com.babyshop.product.dto.ProductVariantResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Toplu varyant islemleri. Stok/Envanter ekrani farkli urunlerin varyantlarini birlikte
 * degistirdigi icin yol urune bagli degildir.
 */
@RestController
@RequestMapping("/api/v1/admin/variants")
@RequiredArgsConstructor
public class ProductVariantBulkAdminController {

    private final ProductVariantService productVariantService;

    @PatchMapping
    public ResponseEntity<List<ProductVariantResponse>> updateProductVariants(
            @Valid @RequestBody ProductVariantBulkUpdateRequest request
    ) {
        return ResponseEntity.ok(productVariantService.updateProductVariants(request.variants()));
    }

    // DELETE govdesi tasimadigi icin (ve araya giren vekil sunucular govdeyi atabildigi icin) POST.
    @PostMapping("/delete")
    public ResponseEntity<Void> deleteProductVariants(
            @Valid @RequestBody ProductVariantBulkDeleteRequest request
    ) {
        productVariantService.deleteProductVariants(request.ids());
        return ResponseEntity.noContent().build();
    }
}
