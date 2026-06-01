package com.babyshop.product;

import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductVariantAdminRequest;
import com.babyshop.product.dto.ProductVariantResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductVariantService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    public List<ProductVariantResponse> getProductVariants(Long productId) {
        ensureProductExists(productId);

        return productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(productId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductVariantResponse createProductVariant(Long productId, ProductVariantAdminRequest request) {
        Product product = findProduct(productId);
        validateOptionComboForCreate(productId, request.sizeLabel(), request.colorName());
        validateSkuForCreate(request.sku());

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        applyRequest(variant, request);

        return toResponse(productVariantRepository.save(variant));
    }

    @Transactional
    public ProductVariantResponse updateProductVariant(Long productId, Long variantId, ProductVariantAdminRequest request) {
        ProductVariant variant = findProductVariant(productId, variantId);
        validateOptionComboForUpdate(productId, variantId, request.sizeLabel(), request.colorName());
        validateSkuForUpdate(variantId, request.sku());
        applyRequest(variant, request);

        return toResponse(productVariantRepository.save(variant));
    }

    @Transactional
    public ProductVariantResponse updateProductVariantStock(Long productId, Long variantId, int stockQuantity) {
        ProductVariant variant = findProductVariant(productId, variantId);
        variant.setStockQuantity(stockQuantity);

        return toResponse(productVariantRepository.save(variant));
    }

    @Transactional
    public void deleteProductVariant(Long productId, Long variantId) {
        ProductVariant variant = findProductVariant(productId, variantId);
        variant.setActive(false);
        productVariantRepository.save(variant);
    }

    private void applyRequest(ProductVariant variant, ProductVariantAdminRequest request) {
        variant.setSku(normalizeSku(request.sku()));
        variant.setSizeLabel(request.sizeLabel().trim());
        variant.setColorName(request.colorName().trim());
        variant.setStockQuantity(request.stockQuantity());
        variant.setPrice(request.price());
        variant.setCurrency(request.currency().trim().toUpperCase());
        variant.setActive(request.active());
    }

    private void validateOptionComboForCreate(Long productId, String sizeLabel, String colorName) {
        if (productVariantRepository.existsByProductIdAndSizeLabelAndColorName(
                productId,
                sizeLabel.trim(),
                colorName.trim()
        )) {
            throw new DuplicateResourceException("Product variant already exists for size/color combination");
        }
    }

    private void validateOptionComboForUpdate(Long productId, Long variantId, String sizeLabel, String colorName) {
        if (productVariantRepository.existsByProductIdAndSizeLabelAndColorNameAndIdNot(
                productId,
                sizeLabel.trim(),
                colorName.trim(),
                variantId
        )) {
            throw new DuplicateResourceException("Product variant already exists for size/color combination");
        }
    }

    private void validateSkuForCreate(String sku) {
        String normalizedSku = normalizeSku(sku);
        if (normalizedSku != null && productVariantRepository.existsBySku(normalizedSku)) {
            throw new DuplicateResourceException("Product variant SKU already exists: " + normalizedSku);
        }
    }

    private void validateSkuForUpdate(Long variantId, String sku) {
        String normalizedSku = normalizeSku(sku);
        if (normalizedSku != null && productVariantRepository.existsBySkuAndIdNot(normalizedSku, variantId)) {
            throw new DuplicateResourceException("Product variant SKU already exists: " + normalizedSku);
        }
    }

    private String normalizeSku(String sku) {
        if (sku == null || sku.trim().isEmpty()) {
            return null;
        }

        return sku.trim();
    }

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found for id: " + productId));
    }

    private void ensureProductExists(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found for id: " + productId);
        }
    }

    private ProductVariant findProductVariant(Long productId, Long variantId) {
        return productVariantRepository.findByIdAndProductId(variantId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product variant not found for product id: " + productId + " and variant id: " + variantId
                ));
    }

    private ProductVariantResponse toResponse(ProductVariant variant) {
        return new ProductVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getSizeLabel(),
                variant.getColorName(),
                variant.getStockQuantity(),
                variant.getPrice(),
                variant.getCurrency(),
                variant.isActive()
        );
    }
}
