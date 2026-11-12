package com.babyshop.product;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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

    // Rezerve edilen stogu kosulsuz geri verir (yeniden kullanilan siparisin hemen tekrar rezerve
    // edilecek kalemleri ve stok_reserved_at bilinmeyen siparisler icin).
    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQuantity = v.stockQuantity + :quantity WHERE v.id = :id")
    int restoreStock(@Param("id") Long id, @Param("quantity") int quantity);

    // Iptal / basarisiz odeme / sure asimi: stogu, admin rezervasyondan sonra stogu elle ayarlamadiysa
    // geri verir. Ayarladiysa admin'in girdigi deger gecerlidir (0 = satista yok) ve 0 satir guncellenir.
    @Modifying
    @Query("UPDATE ProductVariant v SET v.stockQuantity = v.stockQuantity + :quantity "
            + "WHERE v.id = :id AND (v.stockAdjustedAt IS NULL OR v.stockAdjustedAt < :reservedAt)")
    int restoreStockUnlessAdjustedSince(
            @Param("id") Long id,
            @Param("quantity") int quantity,
            @Param("reservedAt") java.time.OffsetDateTime reservedAt
    );

    List<ProductVariant> findAllByProductIdOrderBySizeLabelAscColorNameAsc(Long productId);

    List<ProductVariant> findAllByProductIdIn(Collection<Long> productIds);

    // Kalici silme. Dogrudan SQL'e gider; boylece Product.variants uzerindeki cascade, silinen
    // satiri flush sirasinda geri yazmaz. Siparis kalemleri kendi kopyasini tutar (FK: SET NULL).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM ProductVariant v WHERE v.id IN :ids")
    int deleteAllByIdIn(@Param("ids") Collection<Long> ids);

    Optional<ProductVariant> findByIdAndProductId(Long id, Long productId);

    // Admin stok yazimlari icin satir kilidi (SELECT ... FOR UPDATE): panelin gordugu stok ile
    // karsilastirma ve yazim arasinda bir siparisin atomik stok dusumu araya giremez, kilit birakilana
    // kadar bekler. Kilitler id sirasiyla alinir (siparis rezervasyonu da ayni sirayi izler).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM ProductVariant v WHERE v.id IN :ids ORDER BY v.id")
    List<ProductVariant> findAllByIdForUpdate(@Param("ids") Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM ProductVariant v WHERE v.id = :id AND v.product.id = :productId")
    Optional<ProductVariant> findByIdAndProductIdForUpdate(@Param("id") Long id, @Param("productId") Long productId);

    boolean existsByProductIdAndSizeLabelAndColorName(Long productId, String sizeLabel, String colorName);

    boolean existsByProductIdAndSizeLabelAndColorNameAndIdNot(Long productId, String sizeLabel, String colorName, Long id);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);
}
