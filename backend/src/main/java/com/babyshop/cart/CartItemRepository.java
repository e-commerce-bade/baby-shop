package com.babyshop.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndId(Long cartId, Long id);

    Optional<CartItem> findByCartIdAndProductVariantId(Long cartId, Long productVariantId);

    @Modifying
    @Query(
            value = """
                    delete from cart_items
                    where product_variant_id in (
                        select id from product_variants where product_id = :productId
                    )
                    """,
            nativeQuery = true
    )
    void deleteAllByProductId(@Param("productId") Long productId);

    // Varyant silinmeden once o varyanti tasiyan sepet satirlari temizlenir (cart_items FK'si kisitlayici).
    @Modifying
    @Query(
            value = "delete from cart_items where product_variant_id in (:variantIds)",
            nativeQuery = true
    )
    void deleteAllByProductVariantIds(@Param("variantIds") Collection<Long> variantIds);
}
