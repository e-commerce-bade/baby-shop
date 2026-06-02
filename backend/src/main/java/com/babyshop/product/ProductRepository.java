package com.babyshop.product;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"category", "variants"})
    List<Product> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"category", "variants"})
    List<Product> findAllByActiveTrueOrderByCreatedAtDesc();

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    @EntityGraph(attributePaths = {"category", "variants"})
    List<Product> findAllByActiveTrueAndCategorySlugOrderByCreatedAtDesc(String categorySlug);

    @EntityGraph(attributePaths = {"category", "variants"})
    Optional<Product> findById(Long id);

    @EntityGraph(attributePaths = {"category", "variants"})
    Optional<Product> findBySlugAndActiveTrue(String slug);
}
