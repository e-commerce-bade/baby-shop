package com.babyshop.customer;

import com.babyshop.product.dto.ProductSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/favorites")
@RequiredArgsConstructor
public class CustomerFavoriteController {

    private final CustomerFavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<List<ProductSummaryResponse>> getFavorites(Authentication authentication) {
        return ResponseEntity.ok(favoriteService.getFavorites(authentication.getName()));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<Void> addFavorite(@PathVariable Long productId, Authentication authentication) {
        favoriteService.addFavorite(authentication.getName(), productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable Long productId, Authentication authentication) {
        favoriteService.removeFavorite(authentication.getName(), productId);
        return ResponseEntity.noContent().build();
    }
}
