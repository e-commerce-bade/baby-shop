package com.babyshop.cart;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    Optional<CartItem> findByCartIdAndId(Long cartId, Long id);

    Optional<CartItem> findByCartIdAndProductVariantId(Long cartId, Long productVariantId);
}
