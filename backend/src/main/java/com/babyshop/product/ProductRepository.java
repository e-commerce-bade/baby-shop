package com.babyshop.product;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"category", "images", "variants"})
    List<Product> findAllByActiveTrueOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"category", "images", "variants"})
    List<Product> findAllByActiveTrueAndCategorySlugOrderByCreatedAtDesc(String categorySlug);

    @EntityGraph(attributePaths = {"category", "images", "variants"})
    Optional<Product> findBySlugAndActiveTrue(String slug);
}
