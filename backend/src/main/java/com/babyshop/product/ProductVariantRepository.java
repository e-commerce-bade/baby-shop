package com.babyshop.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"product", "product.images"})
    Optional<ProductVariant> findById(Long id);

    List<ProductVariant> findAllByProductIdOrderBySizeLabelAscColorNameAsc(Long productId);

    Optional<ProductVariant> findByIdAndProductId(Long id, Long productId);

    boolean existsByProductIdAndSizeLabelAndColorName(Long productId, String sizeLabel, String colorName);

    boolean existsByProductIdAndSizeLabelAndColorNameAndIdNot(Long productId, String sizeLabel, String colorName, Long id);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);
}
