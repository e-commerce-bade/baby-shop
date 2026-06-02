package com.babyshop.product;

import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductImageAdminRequest;
import com.babyshop.product.dto.ProductImageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductImageService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;

    public List<ProductImageResponse> getProductImages(Long productId) {
        ensureProductExists(productId);

        return productImageRepository.findAllByProductIdOrderBySortOrderAscIdAsc(productId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductImageResponse createProductImage(Long productId, ProductImageAdminRequest request) {
        Product product = findProduct(productId);
        ProductImage image = new ProductImage();
        image.setProduct(product);
        applyRequest(image, request);

        ProductImage savedImage = productImageRepository.save(image);
        normalizePrimaryImage(productId, savedImage.getId(), savedImage.isPrimary());

        return toResponse(findProductImage(productId, savedImage.getId()));
    }

    @Transactional
    public ProductImageResponse updateProductImage(Long productId, Long imageId, ProductImageAdminRequest request) {
        ProductImage image = findProductImage(productId, imageId);
        applyRequest(image, request);

        ProductImage savedImage = productImageRepository.save(image);
        normalizePrimaryImage(productId, savedImage.getId(), savedImage.isPrimary());

        return toResponse(findProductImage(productId, imageId));
    }

    @Transactional
    public void deleteProductImage(Long productId, Long imageId) {
        ProductImage image = findProductImage(productId, imageId);
        productImageRepository.delete(image);
    }

    private void normalizePrimaryImage(Long productId, Long selectedImageId, boolean selectedIsPrimary) {
        if (!selectedIsPrimary) {
            return;
        }

        List<ProductImage> images = productImageRepository.findAllByProductIdOrderBySortOrderAscIdAsc(productId);
        for (ProductImage image : images) {
            image.setPrimary(image.getId().equals(selectedImageId));
        }
        productImageRepository.saveAll(images);
    }

    private void applyRequest(ProductImage image, ProductImageAdminRequest request) {
        image.setImageUrl(request.imageUrl().trim());
        image.setAltText(request.altText());
        image.setSortOrder(request.sortOrder());
        image.setPrimary(request.primary());
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

    private ProductImage findProductImage(Long productId, Long imageId) {
        return productImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product image not found for product id: " + productId + " and image id: " + imageId
                ));
    }

    private ProductImageResponse toResponse(ProductImage image) {
        return new ProductImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getAltText(),
                image.getSortOrder(),
                image.isPrimary()
        );
    }
}
