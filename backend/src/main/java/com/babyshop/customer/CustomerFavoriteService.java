package com.babyshop.customer;

import com.babyshop.auth.UserAccount;
import com.babyshop.auth.UserAccountRepository;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.ProductRepository;
import com.babyshop.product.ProductService;
import com.babyshop.product.dto.ProductSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomerFavoriteService {

    private final CustomerFavoriteRepository favoriteRepository;
    private final UserAccountRepository userAccountRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> getFavorites(String email) {
        UserAccount user = resolveUser(email);
        List<Long> productIds = favoriteRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(CustomerFavorite::getProductId)
                .toList();

        return productService.getActiveProductSummariesByIds(productIds);
    }

    @Transactional
    public void addFavorite(String email, Long productId) {
        UserAccount user = resolveUser(email);
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found for id: " + productId);
        }

        // Idempotent: zaten favorideyse tekrar eklemez.
        if (!favoriteRepository.existsByUserIdAndProductId(user.getId(), productId)) {
            CustomerFavorite favorite = new CustomerFavorite();
            favorite.setUserId(user.getId());
            favorite.setProductId(productId);
            favoriteRepository.save(favorite);
        }
    }

    @Transactional
    public void removeFavorite(String email, Long productId) {
        UserAccount user = resolveUser(email);
        favoriteRepository.deleteByUserIdAndProductId(user.getId(), productId);
    }

    private UserAccount resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidRequestException("Authenticated user email is required");
        }

        return userAccountRepository.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found for email: " + email));
    }
}
