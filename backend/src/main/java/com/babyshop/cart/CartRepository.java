package com.babyshop.cart;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    @EntityGraph(attributePaths = {"items", "items.productVariant", "items.productVariant.product", "items.productVariant.product.images"})
    Optional<Cart> findBySessionId(String sessionId);
}
