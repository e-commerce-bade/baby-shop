package com.babyshop.product;

import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.product.dto.ProductVariantAdminRequest;
import com.babyshop.product.dto.ProductVariantResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ProductVariantServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @InjectMocks
    private ProductVariantService productVariantService;

    @Test
    void shouldUpdateVariantStockQuantity() {
        ProductVariant variant = buildVariant(10L, 12);
        given(productVariantRepository.findByIdAndProductId(10L, 1L)).willReturn(Optional.of(variant));
        given(productVariantRepository.save(any(ProductVariant.class))).willAnswer(invocation -> invocation.getArgument(0));

        ProductVariantResponse response = productVariantService.updateProductVariantStock(1L, 10L, 4);

        assertThat(response.stockQuantity()).isEqualTo(4);
        assertThat(variant.getStockQuantity()).isEqualTo(4);
    }

    @Test
    void shouldThrowWhenVariantMissingDuringStockUpdate() {
        given(productVariantRepository.findByIdAndProductId(10L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> productVariantService.updateProductVariantStock(1L, 10L, 4))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Product variant not found for product id: 1 and variant id: 10");
    }

    @Test
    void shouldCreateVariantWithNormalizedCurrencyAndSku() {
        Product product = new Product();
        product.setId(1L);

        ProductVariantAdminRequest request = new ProductVariantAdminRequest(
                " SKU-1 ",
                "6-9 months",
                "Pink",
                12,
                new BigDecimal("499.00"),
                "try",
                true
        );

        given(productRepository.findById(1L)).willReturn(Optional.of(product));
        given(productVariantRepository.existsByProductIdAndSizeLabelAndColorName(1L, "6-9 months", "Pink"))
                .willReturn(false);
        given(productVariantRepository.existsBySku("SKU-1")).willReturn(false);
        given(productVariantRepository.save(any(ProductVariant.class))).willAnswer(invocation -> invocation.getArgument(0));

        ProductVariantResponse response = productVariantService.createProductVariant(1L, request);

        assertThat(response.sku()).isEqualTo("SKU-1");
        assertThat(response.currency()).isEqualTo("TRY");
    }

    @Test
    void shouldRejectDuplicateSkuDuringCreate() {
        Product product = new Product();
        product.setId(1L);

        ProductVariantAdminRequest request = new ProductVariantAdminRequest(
                "SKU-1",
                "6-9 months",
                "Pink",
                12,
                new BigDecimal("499.00"),
                "TRY",
                true
        );

        given(productRepository.findById(1L)).willReturn(Optional.of(product));
        given(productVariantRepository.existsByProductIdAndSizeLabelAndColorName(1L, "6-9 months", "Pink"))
                .willReturn(false);
        given(productVariantRepository.existsBySku("SKU-1")).willReturn(true);

        assertThatThrownBy(() -> productVariantService.createProductVariant(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Product variant SKU already exists: SKU-1");
    }

    private ProductVariant buildVariant(Long id, int stockQuantity) {
        Product product = new Product();
        product.setId(1L);

        ProductVariant variant = new ProductVariant();
        variant.setId(id);
        variant.setProduct(product);
        variant.setSku("SKU-1");
        variant.setSizeLabel("6-9 months");
        variant.setColorName("Pink");
        variant.setStockQuantity(stockQuantity);
        variant.setPrice(new BigDecimal("499.00"));
        variant.setCurrency("TRY");
        variant.setActive(true);
        return variant;
    }
}
