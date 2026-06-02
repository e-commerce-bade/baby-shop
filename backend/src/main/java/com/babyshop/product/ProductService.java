package com.babyshop.product;

import com.babyshop.category.Category;
import com.babyshop.category.CategoryRepository;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.product.dto.ProductDetailResponse;
import com.babyshop.product.dto.ProductAdminRequest;
import com.babyshop.product.dto.ProductImageResponse;
import com.babyshop.product.dto.ProductSummaryResponse;
import com.babyshop.product.dto.ProductVariantResponse;
import com.babyshop.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public List<ProductSummaryResponse> getActiveProducts(String categorySlug) {
        List<Product> products = hasText(categorySlug)
                ? productRepository.findAllByActiveTrueAndCategorySlugOrderByCreatedAtDesc(categorySlug.trim())
                : productRepository.findAllByActiveTrueOrderByCreatedAtDesc();

        return products.stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public List<ProductSummaryResponse> getAllProductsForAdmin() {
        return productRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    public ProductDetailResponse getActiveProductBySlug(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found for slug: " + slug));

        return toDetailResponse(product);
    }

    public ProductDetailResponse getProductById(Long id) {
        return toDetailResponse(findProductById(id));
    }

    @Transactional
    public ProductDetailResponse createProduct(ProductAdminRequest request) {
        validateSlugForCreate(request.slug());

        Product product = new Product();
        applyRequest(product, request);

        return toDetailResponse(productRepository.save(product));
    }

    @Transactional
    public ProductDetailResponse updateProduct(Long id, ProductAdminRequest request) {
        Product product = findProductById(id);
        validateSlugForUpdate(id, request.slug());
        applyRequest(product, request);

        return toDetailResponse(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = findProductById(id);
        product.setActive(false);
        productRepository.save(product);
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found for id: " + id));
    }

    private void applyRequest(Product product, ProductAdminRequest request) {
        product.setCategory(resolveCategory(request.categoryId()));
        product.setName(request.name().trim());
        product.setSlug(request.slug().trim());
        product.setDescription(request.description());
        product.setBrand(request.brand());
        product.setActive(request.active());
    }

    private Category resolveCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for id: " + categoryId));
    }

    private void validateSlugForCreate(String slug) {
        if (productRepository.existsBySlug(slug.trim())) {
            throw new DuplicateResourceException("Product slug already exists: " + slug);
        }
    }

    private void validateSlugForUpdate(Long id, String slug) {
        if (productRepository.existsBySlugAndIdNot(slug.trim(), id)) {
            throw new DuplicateResourceException("Product slug already exists: " + slug);
        }
    }

    private ProductSummaryResponse toSummaryResponse(Product product) {
        List<ProductVariantResponse> variants = product.getVariants().stream()
                .filter(ProductVariant::isActive)
                .map(this::toVariantResponse)
                .toList();

        return new ProductSummaryResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                product.getBrand(),
                product.isActive(),
                product.getCategory().getName(),
                product.getCategory().getSlug(),
                findMinPrice(product),
                findCurrency(product),
                findPrimaryImageUrl(product),
                variants
        );
    }

    private ProductDetailResponse toDetailResponse(Product product) {
        List<ProductImageResponse> images = product.getImages().stream()
                .sorted(Comparator.comparingInt(ProductImage::getSortOrder))
                .map(this::toImageResponse)
                .toList();

        List<ProductVariantResponse> variants = product.getVariants().stream()
                .sorted(Comparator.comparing(ProductVariant::getSizeLabel).thenComparing(ProductVariant::getColorName))
                .map(this::toVariantResponse)
                .toList();

        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                product.getBrand(),
                product.isActive(),
                product.getCategory().getName(),
                product.getCategory().getSlug(),
                findMinPrice(product),
                findCurrency(product),
                images,
                variants
        );
    }

    private ProductImageResponse toImageResponse(ProductImage image) {
        return new ProductImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getAltText(),
                image.getSortOrder(),
                image.isPrimary()
        );
    }

    private ProductVariantResponse toVariantResponse(ProductVariant variant) {
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

    private BigDecimal findMinPrice(Product product) {
        return product.getVariants().stream()
                .filter(ProductVariant::isActive)
                .map(ProductVariant::getPrice)
                .min(Comparator.naturalOrder())
                .orElse(BigDecimal.ZERO);
    }

    private String findCurrency(Product product) {
        return product.getVariants().stream()
                .filter(ProductVariant::isActive)
                .map(ProductVariant::getCurrency)
                .findFirst()
                .orElse("TRY");
    }

    private String findPrimaryImageUrl(Product product) {
        return product.getImages().stream()
                .sorted(Comparator.comparing(ProductImage::isPrimary).reversed().thenComparingInt(ProductImage::getSortOrder))
                .map(ProductImage::getImageUrl)
                .findFirst()
                .orElse(null);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
