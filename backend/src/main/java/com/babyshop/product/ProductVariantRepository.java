package com.babyshop.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"product", "product.images"})
    Optional<ProductVariant> findById(Long id);

    // Atomik kosullu dusum: yarisi ko-suzlastirir (lost-update'i onler). Yeterli stok
    // yoksa 0 satir gunceller; cagiran taraf bu durumu ele alir.
    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQuantity = v.stockQuantity - :quantity "
            + "WHERE v.id = :id AND v.stockQuantity >= :quantity")
    int decrementStockIfAvailable(@Param("id") Long id, @Param("quantity") int quantity);

    // Yetersiz stok durumunda negatife dusmeden 0'a sabitler (asiri satis gorunur kilinir).
    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQuantity = 0 WHERE v.id = :id AND v.stockQuantity > 0")
    int clampStockToZero(@Param("id") Long id);

    // Rezerve edilen stogu geri verir (iptal / basarisiz odeme / sure asimi).
    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQuantity = v.stockQuantity + :quantity WHERE v.id = :id")
    int restoreStock(@Param("id") Long id, @Param("quantity") int quantity);

    List<ProductVariant> findAllByProductIdOrderBySizeLabelAscColorNameAsc(Long productId);

    Optional<ProductVariant> findByIdAndProductId(Long id, Long productId);

    boolean existsByProductIdAndSizeLabelAndColorName(Long productId, String sizeLabel, String colorName);

    boolean existsByProductIdAndSizeLabelAndColorNameAndIdNot(Long productId, String sizeLabel, String colorName, Long id);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);
}
