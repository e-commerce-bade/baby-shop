package com.babyshop.product;

import com.babyshop.cart.CartItemRepository;
import com.babyshop.category.Category;
import com.babyshop.category.CategoryRepository;
import com.babyshop.product.dto.ProductDetailResponse;
import com.babyshop.product.dto.ProductFacetsResponse;
import com.babyshop.product.dto.ProductVariantResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    void shouldHideInactiveVariantsOnStorefrontProductPage() {
        Product product = buildProduct();
        given(productRepository.findBySlugAndActiveTrue("desenli-takim")).willReturn(Optional.of(product));

        ProductDetailResponse response = productService.getActiveProductBySlug("desenli-takim");

        assertThat(response.variants()).extracting(ProductVariantResponse::sizeLabel).containsExactly("5-6 Yaş");
    }

    @Test
    void shouldKeepInactiveVariantsInAdminProductDetail() {
        Product product = buildProduct();
        given(productRepository.findById(1L)).willReturn(Optional.of(product));

        ProductDetailResponse response = productService.getProductById(1L);

        assertThat(response.variants()).extracting(ProductVariantResponse::sizeLabel)
                .containsExactly("5-6 Yaş", "6 Yaş");
    }

    @Test
    void shouldOfferEachFilterOptionOnceInReadableOrder() {
        Product product = buildProduct();
        product.setVariants(List.of(
                buildVariant(10L, product, "10-11 Yaş", "pembe"),
                buildVariant(11L, product, "3-4 Yaş", "Pembe"),
                buildVariant(12L, product, "3-4 YAŞ", "Pembe"),
                buildVariant(13L, product, "3-4 Yaş", "Haki")
        ));
        given(productRepository.findAllByActiveTrueOrderByCreatedAtDesc()).willReturn(List.of(product));

        ProductFacetsResponse facets = productService.getFacets();

        assertThat(facets.sizes()).containsExactly("3-4 Yaş", "10-11 Yaş");
        assertThat(facets.colors()).containsExactly("Haki", "Pembe");
    }

    private ProductVariant buildVariant(Long id, Product product, String sizeLabel, String colorName) {
        ProductVariant variant = buildVariant(id, product, sizeLabel, true);
        variant.setColorName(colorName);
        return variant;
    }

    private Product buildProduct() {
        Category category = new Category();
        category.setName("Erkek Çocuk");
        category.setSlug("erkek-cocuk");

        Product product = new Product();
        product.setId(1L);
        product.setName("Desenli Takım");
        product.setSlug("desenli-takim");
        product.setCategory(category);
        product.setActive(true);
        product.setVariants(List.of(
                buildVariant(10L, product, "5-6 Yaş", true),
                buildVariant(11L, product, "6 Yaş", false)
        ));
        return product;
    }

    private ProductVariant buildVariant(Long id, Product product, String sizeLabel, boolean active) {
        ProductVariant variant = new ProductVariant();
        variant.setId(id);
        variant.setProduct(product);
        variant.setSizeLabel(sizeLabel);
        variant.setColorName("Haki");
        variant.setStockQuantity(5);
        variant.setPrice(new BigDecimal("550.00"));
        variant.setCurrency("TRY");
        variant.setActive(active);
        return variant;
    }
}
