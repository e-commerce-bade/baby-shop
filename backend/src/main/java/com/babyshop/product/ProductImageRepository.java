package com.babyshop.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findAllByProductIdOrderBySortOrderAscIdAsc(Long productId);

    List<ProductImage> findAllByProductIdInOrderBySortOrderAscIdAsc(Collection<Long> productIds);

    Optional<ProductImage> findByIdAndProductId(Long id, Long productId);
}
