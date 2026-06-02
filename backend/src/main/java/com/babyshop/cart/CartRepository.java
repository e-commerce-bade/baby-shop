package com.babyshop.cart;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    @EntityGraph(attributePaths = {"user", "items", "items.productVariant", "items.productVariant.product"})
    Optional<Cart> findBySessionId(String sessionId);

    @EntityGraph(attributePaths = {"user", "items", "items.productVariant", "items.productVariant.product"})
    Optional<Cart> findByUserEmailIgnoreCaseAndStatus(String email, String status);
}
