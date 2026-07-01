package com.babyshop.product;

import com.babyshop.category.Category;
import com.babyshop.category.CategoryRepository;
import com.babyshop.cart.CartItemRepository;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.response.PageResponse;
import com.babyshop.product.dto.ProductDetailResponse;
import com.babyshop.product.dto.ProductAdminRequest;
import com.babyshop.product.dto.ProductFacetsResponse;
import com.babyshop.product.dto.ProductImageResponse;
import com.babyshop.product.dto.ProductSummaryResponse;
import com.babyshop.product.dto.ProductVariantResponse;
import com.babyshop.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CartItemRepository cartItemRepository;

    public List<ProductSummaryResponse> getActiveProducts(String categorySlug) {
        List<Product> products = hasText(categorySlug)
                ? productRepository.findAllByActiveTrueAndCategorySlugOrderByCreatedAtDesc(categorySlug.trim())
                : productRepository.findAllByActiveTrueOrderByCreatedAtDesc();

        return products.stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    private static final int MAX_PAGE_SIZE = 60;
    private static final int DEFAULT_PAGE_SIZE = 12;

    public PageResponse<ProductSummaryResponse> searchActiveProducts(
            String categorySlug,
            String query,
            String productTypes,
            String colors,
            String sizes,
            String price,
            String sort,
            int page,
            int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);

        ProductSpecifications.Criteria criteria = new ProductSpecifications.Criteria(
                categorySlug,
                query,
                splitCsv(productTypes),
                splitCsv(colors),
                splitCsv(sizes),
                price,
                sort
        );

        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<ProductSummaryResponse> result = productRepository
                .findAll(ProductSpecifications.matching(criteria), pageable)
                .map(this::toSummaryResponse);

        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext(),
                result.hasPrevious()
        );
    }

    private List<String> splitCsv(String value) {
        if (!hasText(value)) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .toList();
    }

    // Filtre kenar cubugu secenekleri: yalnizca aktif urunlerden/varyantlardan turetilir; boylece
    // gosterilen her kategori/tip/renk/beden gercekten filtrelenebilir ve bos sonuc vermez.
    public ProductFacetsResponse getFacets() {
        List<Product> products = productRepository.findAllByActiveTrueOrderByCreatedAtDesc();

        Map<String, String> categoryNameBySlug = new LinkedHashMap<>();
        Set<String> productTypes = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> colors = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> sizes = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        for (Product product : products) {
            Category category = product.getCategory();
            if (category != null && hasText(category.getSlug())) {
                categoryNameBySlug.putIfAbsent(category.getSlug().trim(), category.getName());
            }
            if (hasText(product.getProductType())) {
                productTypes.add(product.getProductType().trim());
            }
            for (ProductVariant variant : product.getVariants()) {
                if (!variant.isActive()) {
                    continue;
                }
                if (hasText(variant.getColorName())) {
                    colors.add(variant.getColorName().trim());
                }
                if (hasText(variant.getSizeLabel())) {
                    sizes.add(variant.getSizeLabel().trim());
                }
            }
        }

        List<ProductFacetsResponse.CategoryFacet> categories = categoryNameBySlug.entrySet().stream()
                .map(entry -> new ProductFacetsResponse.CategoryFacet(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(ProductFacetsResponse.CategoryFacet::name, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return new ProductFacetsResponse(
                categories,
                List.copyOf(productTypes),
                List.copyOf(colors),
                List.copyOf(sizes)
        );
    }

    public List<ProductSummaryResponse> getAllProductsForAdmin() {
        return productRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    // Verilen id sirasini koruyarak aktif urunlerin ozetlerini dondurur (favoriler vb. icin).
    public List<ProductSummaryResponse> getActiveProductSummariesByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        java.util.Map<Long, Product> activeById = productRepository.findAllById(ids).stream()
                .filter(Product::isActive)
                .collect(java.util.stream.Collectors.toMap(Product::getId, product -> product));

        return ids.stream()
                .map(activeById::get)
                .filter(java.util.Objects::nonNull)
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
        Product product = new Product();
        applyRequest(product, request, generateUniqueSlug(request.slug()));

        return toDetailResponse(productRepository.save(product));
    }

    @Transactional
    public ProductDetailResponse updateProduct(Long id, ProductAdminRequest request) {
        Product product = findProductById(id);
        validateSlugForUpdate(id, request.slug());
        applyRequest(product, request, request.slug().trim());

        return toDetailResponse(productRepository.save(product));
    }

    @Transactional
    public ProductDetailResponse updateProductActiveStatus(Long id, boolean active) {
        Product product = findProductById(id);
        product.setActive(active);
        return toDetailResponse(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = findProductById(id);
        cartItemRepository.deleteAllByProductId(id);
        productRepository.delete(product);
    }

    private Product findProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found for id: " + id));
    }

    private void applyRequest(Product product, ProductAdminRequest request, String slug) {
        product.setCategory(resolveCategory(request.categoryId()));
        product.setName(request.name().trim());
        product.setSlug(slug);
        product.setDescription(request.description());
        product.setBrand(request.brand());
        product.setProductType(hasText(request.productType()) ? request.productType().trim() : null);
        product.setActive(request.active());
    }

    private Category resolveCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found for id: " + categoryId));
    }

    private String generateUniqueSlug(String requestedSlug) {
        String baseSlug = requestedSlug.trim();
        if (!productRepository.existsBySlug(baseSlug)) {
            return baseSlug;
        }

        for (int suffix = 2; ; suffix++) {
            String candidate = appendSlugSuffix(baseSlug, suffix);
            if (!productRepository.existsBySlug(candidate)) {
                return candidate;
            }
        }
    }

    private String appendSlugSuffix(String baseSlug, int suffix) {
        String suffixText = "-" + suffix;
        int maxBaseLength = 220 - suffixText.length();
        String trimmedBase = baseSlug.length() > maxBaseLength
                ? baseSlug.substring(0, maxBaseLength).replaceAll("-+$", "")
                : baseSlug;
        return trimmedBase + suffixText;
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
                product.getProductType(),
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
                product.getProductType(),
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
                image.getColorName(),
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
                variant.getCompareAtPrice(),
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
