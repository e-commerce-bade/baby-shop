package com.babyshop.customer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerFavoriteRepository extends JpaRepository<CustomerFavorite, Long> {

    List<CustomerFavorite> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndProductId(Long userId, Long productId);

    long deleteByUserIdAndProductId(Long userId, Long productId);
}
