package com.babyshop.product;

import com.babyshop.cart.CartItemRepository;
import com.babyshop.common.exception.DuplicateResourceException;
import com.babyshop.common.exception.InvalidRequestException;
import com.babyshop.common.exception.ResourceNotFoundException;
import com.babyshop.common.exception.StockConflictException;
import com.babyshop.product.dto.ProductVariantAdminRequest;
import com.babyshop.product.dto.ProductVariantBulkCreateRequest;
import com.babyshop.product.dto.ProductVariantBulkUpdateRequest;
import com.babyshop.product.dto.ProductVariantResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProductVariantServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @InjectMocks
    private ProductVariantService productVariantService;

    @Test
    void shouldUpdateVariantStockQuantity() {
        ProductVariant variant = buildVariant(10L, 12);
        given(productVariantRepository.findByIdAndProductIdForUpdate(10L, 1L)).willReturn(Optional.of(variant));
        given(productVariantRepository.save(any(ProductVariant.class))).willAnswer(invocation -> invocation.getArgument(0));

        ProductVariantResponse response = productVariantService.updateProductVariantStock(1L, 10L, 4, null);

        assertThat(response.stockQuantity()).isEqualTo(4);
        assertThat(variant.getStockQuantity()).isEqualTo(4);
    }

    @Test
    void shouldThrowWhenVariantMissingDuringStockUpdate() {
        given(productVariantRepository.findByIdAndProductIdForUpdate(10L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> productVariantService.updateProductVariantStock(1L, 10L, 4, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Product variant not found for product id: 1 and variant id: 10");
    }

    @Test
    void shouldWriteStockWhenItIsStillWhatThePanelShowed() {
        ProductVariant variant = buildVariant(10L, 5);
        given(productVariantRepository.findByIdAndProductIdForUpdate(10L, 1L)).willReturn(Optional.of(variant));
        given(productVariantRepository.save(any(ProductVariant.class))).willAnswer(invocation -> invocation.getArgument(0));

        ProductVariantResponse response = productVariantService.updateProductVariantStock(1L, 10L, 7, 5);

        assertThat(response.stockQuantity()).isEqualTo(7);
    }

    @Test
    void shouldRejectStockUpdateWhenStockChangedSinceThePanelLoaded() {
        // Panel 5 gosteriyordu; bu arada bir siparis 1 adet dustu.
        ProductVariant variant = buildVariant(10L, 4);
        given(productVariantRepository.findByIdAndProductIdForUpdate(10L, 1L)).willReturn(Optional.of(variant));

        assertThatThrownBy(() -> productVariantService.updateProductVariantStock(1L, 10L, 7, 5))
                .isInstanceOfSatisfying(StockConflictException.class, exception -> {
                    assertThat(exception.getConflicts())
                            .containsExactly(new StockConflictException.StockConflict(10L, 5, 4));
                    assertThat(exception.getMessage())
                            .contains("\"Kendinden Desenli Takım\" 6-9 months / Pink stoğu 5 iken 4 oldu")
                            .endsWith("Hiçbir değişiklik kaydedilmedi.");
                });

        assertThat(variant.getStockQuantity()).isEqualTo(4);
        verify(productVariantRepository, never()).save(any());
    }

    @Test
    void shouldKeepCurrentStockWhenOnlyOtherFieldsWereEdited() {
        // Panel 5 gosteriyordu, admin yalnizca fiyati degistirdi; bu arada bir siparis 1 adet dustu.
        ProductVariant variant = buildVariant(10L, 4);
        given(productVariantRepository.findByIdAndProductIdForUpdate(10L, 1L)).willReturn(Optional.of(variant));
        given(productVariantRepository.existsByProductIdAndSizeLabelAndColorNameAndIdNot(1L, "6-9 months", "Pink", 10L))
                .willReturn(false);
        given(productVariantRepository.existsBySkuAndIdNot("SKU-1", 10L)).willReturn(false);
        given(productVariantRepository.save(any(ProductVariant.class))).willAnswer(invocation -> invocation.getArgument(0));

        ProductVariantResponse response = productVariantService.updateProductVariant(1L, 10L, new ProductVariantAdminRequest(
                "SKU-1", "6-9 months", "Pink", 5, new BigDecimal("549.00"), null, "TRY", true, 5));

        assertThat(response.stockQuantity()).isEqualTo(4);
        assertThat(response.price()).isEqualByComparingTo("549.00");
    }

    @Test
    void shouldAddSizesAndColorsWithGeneratedSkusAndTheProductCurrency() {
        Product product = buildProduct();
        ProductVariant existing = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        existing.setCurrency("USD");
        given(productRepository.findById(1L)).willReturn(Optional.of(product));
        given(productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(1L)).willReturn(List.of(existing));
        given(productVariantRepository.existsBySku(anyString())).willReturn(false);
        given(productVariantRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));

        List<ProductVariantResponse> responses = productVariantService.createProductVariants(1L, List.of(
                new ProductVariantBulkCreateRequest.Item(" 7-8 Yaş ", " Haki ", 3, new BigDecimal("650.00"), new BigDecimal("800.00")),
                new ProductVariantBulkCreateRequest.Item("7-8 Yaş", "Açık Mavi", 0, new BigDecimal("650.00"), null)
        ));

        assertThat(responses).extracting(ProductVariantResponse::sizeLabel).containsExactly("7-8 Yaş", "7-8 Yaş");
        assertThat(responses).extracting(ProductVariantResponse::colorName).containsExactly("Haki", "Açık Mavi");
        assertThat(responses).extracting(ProductVariantResponse::stockQuantity).containsExactly(3, 0);
        assertThat(responses).extracting(ProductVariantResponse::currency).containsOnly("USD");
        assertThat(responses).allMatch(ProductVariantResponse::active);
        assertThat(responses.get(0).compareAtPrice()).isEqualByComparingTo("800.00");
        assertThat(responses.get(1).compareAtPrice()).isNull();
        assertThat(responses.get(0).sku()).matches("KDT-HAKI-78YAS-[0-9A-Z]{4}");
        assertThat(responses.get(1).sku()).matches("KDT-ACIKMA-78YAS-[0-9A-Z]{4}");
        // Ayni istekte eklenenler ayni kodu paylasir (panelin yeni urun eklerken yaptigi gibi).
        assertThat(responses.get(0).sku().substring(responses.get(0).sku().length() - 4))
                .isEqualTo(responses.get(1).sku().substring(responses.get(1).sku().length() - 4));
    }

    @Test
    void shouldSuffixGeneratedSkuWhenItIsTaken() {
        Product product = buildProduct();
        given(productRepository.findById(1L)).willReturn(Optional.of(product));
        given(productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(1L)).willReturn(List.of());
        given(productVariantRepository.existsBySku(anyString()))
                .willAnswer(invocation -> !invocation.<String>getArgument(0).endsWith("-2"));
        given(productVariantRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));

        List<ProductVariantResponse> responses = productVariantService.createProductVariants(1L, List.of(
                new ProductVariantBulkCreateRequest.Item("7-8 Yaş", "Haki", 3, new BigDecimal("650.00"), null)
        ));

        assertThat(responses.get(0).sku()).matches("KDT-HAKI-78YAS-[0-9A-Z]{4}-2");
        assertThat(responses.get(0).currency()).isEqualTo("TRY");
    }

    @Test
    void shouldRejectAddingACombinationTheProductAlreadyHas() {
        Product product = buildProduct();
        given(productRepository.findById(1L)).willReturn(Optional.of(product));
        given(productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(1L))
                .willReturn(List.of(buildVariant(10L, product, "5-6 Yaş", "Haki", 5)));
        given(productVariantRepository.existsBySku(anyString())).willReturn(false);

        assertThatThrownBy(() -> productVariantService.createProductVariants(1L, List.of(
                new ProductVariantBulkCreateRequest.Item("7-8 Yaş", "Haki", 3, new BigDecimal("650.00"), null),
                new ProductVariantBulkCreateRequest.Item("5-6 Yaş", " Haki", 3, new BigDecimal("650.00"), null)
        )))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("\"Kendinden Desenli Takım\" ürününde \"5-6 Yaş / Haki\" zaten var.");

        verify(productVariantRepository, never()).saveAll(any());
    }

    @Test
    void shouldRejectTheSameCombinationTwiceInOneRequest() {
        Product product = buildProduct();
        given(productRepository.findById(1L)).willReturn(Optional.of(product));
        given(productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(1L)).willReturn(List.of());
        given(productVariantRepository.existsBySku(anyString())).willReturn(false);

        assertThatThrownBy(() -> productVariantService.createProductVariants(1L, List.of(
                new ProductVariantBulkCreateRequest.Item("7-8 Yaş", "Haki", 3, new BigDecimal("650.00"), null),
                new ProductVariantBulkCreateRequest.Item("7-8 Yaş", "Haki", 1, new BigDecimal("650.00"), null)
        )))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("7-8 Yaş / Haki");

        verify(productVariantRepository, never()).saveAll(any());
    }

    @Test
    void shouldThrowWhenAddingVariantsToAMissingProduct() {
        given(productRepository.findById(1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> productVariantService.createProductVariants(1L, List.of(
                new ProductVariantBulkCreateRequest.Item("7-8 Yaş", "Haki", 3, new BigDecimal("650.00"), null)
        )))
                .isInstanceOf(ResourceNotFoundException.class);
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
                null,
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
                null,
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

    @Test
    void shouldDeleteVariantPermanentlyAndClearCartLines() {
        Product product = buildProduct();
        ProductVariant leftover = buildVariant(10L, product, "6 Yaş", "Haki", 0);
        ProductVariant kept = buildVariant(11L, product, "5-6 Yaş", "Haki", 5);
        given(productVariantRepository.findByIdAndProductId(10L, 1L)).willReturn(Optional.of(leftover));
        given(productVariantRepository.findAllById(List.of(10L))).willReturn(List.of(leftover));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(leftover, kept));

        productVariantService.deleteProductVariant(1L, 10L);

        InOrder inOrder = inOrder(cartItemRepository, productVariantRepository);
        inOrder.verify(cartItemRepository).deleteAllByProductVariantIds(List.of(10L));
        inOrder.verify(productVariantRepository).deleteAllByIdIn(List.of(10L));
    }

    @Test
    void shouldRejectDeletingEveryVariantOfAProduct() {
        Product product = buildProduct();
        ProductVariant first = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        ProductVariant second = buildVariant(11L, product, "7-8 Yaş", "Haki", 5);
        given(productVariantRepository.findAllById(List.of(10L, 11L))).willReturn(List.of(first, second));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(first, second));

        assertThatThrownBy(() -> productVariantService.deleteProductVariants(List.of(10L, 11L)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("tüm varyantları silinemez");

        verify(cartItemRepository, never()).deleteAllByProductVariantIds(any());
        verify(productVariantRepository, never()).deleteAllByIdIn(any());
    }

    @Test
    void shouldRejectDeletingEverySellableVariantWhenOnlyAnInactiveOneWouldRemain() {
        Product product = buildProduct();
        ProductVariant first = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        ProductVariant second = buildVariant(11L, product, "7-8 Yaş", "Haki", 5);
        ProductVariant inactive = buildVariant(12L, product, "6 Yaş", "Haki", 0);
        inactive.setActive(false);
        given(productVariantRepository.findAllById(List.of(10L, 11L))).willReturn(List.of(first, second));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(first, second, inactive));

        assertThatThrownBy(() -> productVariantService.deleteProductVariants(List.of(10L, 11L)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("tüm varyantları silinemez");

        verify(productVariantRepository, never()).deleteAllByIdIn(any());
    }

    @Test
    void shouldAllowDeletingInactiveLeftoverWhileSellableVariantsRemain() {
        Product product = buildProduct();
        ProductVariant sellable = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        ProductVariant inactive = buildVariant(12L, product, "6 Yaş", "Haki", 0);
        inactive.setActive(false);
        given(productVariantRepository.findAllById(List.of(12L))).willReturn(List.of(inactive));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(sellable, inactive));

        productVariantService.deleteProductVariants(List.of(12L));

        verify(productVariantRepository).deleteAllByIdIn(List.of(12L));
    }

    @Test
    void shouldAllowTrimmingAProductThatHasNoSellableVariantAnyway() {
        Product product = buildProduct();
        ProductVariant firstInactive = buildVariant(10L, product, "5-6 Yaş", "Haki", 0);
        ProductVariant secondInactive = buildVariant(11L, product, "6 Yaş", "Haki", 0);
        firstInactive.setActive(false);
        secondInactive.setActive(false);
        given(productVariantRepository.findAllById(List.of(10L))).willReturn(List.of(firstInactive));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(firstInactive, secondInactive));

        productVariantService.deleteProductVariants(List.of(10L));

        verify(productVariantRepository).deleteAllByIdIn(List.of(10L));
    }

    @Test
    void shouldThrowWhenDeletingUnknownVariant() {
        Product product = buildProduct();
        given(productVariantRepository.findAllById(List.of(10L, 99L)))
                .willReturn(List.of(buildVariant(10L, product, "5-6 Yaş", "Haki", 5)));

        assertThatThrownBy(() -> productVariantService.deleteProductVariants(List.of(10L, 99L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Product variant not found for ids: [99]");
    }

    @Test
    void shouldUpdateOnlyProvidedFieldsInBulk() {
        Product product = buildProduct();
        ProductVariant stockOnly = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        ProductVariant renamed = buildVariant(11L, product, "6 Yaş", "Haki", 0);
        given(productVariantRepository.findAllByIdForUpdate(List.of(10L, 11L))).willReturn(List.of(stockOnly, renamed));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(stockOnly, renamed));

        List<ProductVariantResponse> responses = productVariantService.updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, null, 12, null),
                new ProductVariantBulkUpdateRequest.Item(11L, " 6-7 Yaş ", null, new BigDecimal("650.00"))
        ));

        assertThat(responses).extracting(ProductVariantResponse::id).containsExactly(10L, 11L);
        assertThat(stockOnly.getStockQuantity()).isEqualTo(12);
        assertThat(stockOnly.getSizeLabel()).isEqualTo("5-6 Yaş");
        assertThat(stockOnly.getPrice()).isEqualByComparingTo("499.00");
        assertThat(renamed.getSizeLabel()).isEqualTo("6-7 Yaş");
        assertThat(renamed.getStockQuantity()).isZero();
        assertThat(renamed.getPrice()).isEqualByComparingTo("650.00");
        verify(productVariantRepository, never()).saveAllAndFlush(any());
    }

    @Test
    void shouldRejectBulkRenameThatDuplicatesSizeAndColor() {
        Product product = buildProduct();
        ProductVariant existing = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        ProductVariant renamed = buildVariant(11L, product, "6 Yaş", "Haki", 0);
        given(productVariantRepository.findAllByIdForUpdate(List.of(11L))).willReturn(List.of(renamed));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(existing, renamed));

        assertThatThrownBy(() -> productVariantService.updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(11L, "5-6 Yaş", null, null)
        )))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("5-6 Yaş / Haki");

        verify(productVariantRepository, never()).saveAll(any());
    }

    @Test
    void shouldWriteChainedRenamesThroughTemporaryLabels() {
        Product product = buildProduct();
        ProductVariant movesUp = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        ProductVariant takesItsPlace = buildVariant(11L, product, "4-5 Yaş", "Haki", 5);
        given(productVariantRepository.findAllByIdForUpdate(List.of(10L, 11L))).willReturn(List.of(movesUp, takesItsPlace));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(movesUp, takesItsPlace));
        List<String> labelsAtFlush = new ArrayList<>();
        given(productVariantRepository.saveAllAndFlush(any())).willAnswer(invocation -> {
            labelsAtFlush.add(movesUp.getSizeLabel());
            labelsAtFlush.add(takesItsPlace.getSizeLabel());
            return List.of(movesUp, takesItsPlace);
        });

        productVariantService.updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, "6-7 Yaş", null, null),
                new ProductVariantBulkUpdateRequest.Item(11L, "5-6 Yaş", null, null)
        ));

        assertThat(labelsAtFlush).containsExactly("~10", "~11");
        assertThat(movesUp.getSizeLabel()).isEqualTo("6-7 Yaş");
        assertThat(takesItsPlace.getSizeLabel()).isEqualTo("5-6 Yaş");
    }

    @Test
    void shouldRejectBlankSizeLabelInBulkUpdate() {
        Product product = buildProduct();
        ProductVariant variant = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        given(productVariantRepository.findAllByIdForUpdate(List.of(10L))).willReturn(List.of(variant));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(variant));

        assertThatThrownBy(() -> productVariantService.updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, "   ", null, null)
        )))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Beden/yaş boş olamaz.");
    }

    @Test
    void shouldRejectTheWholeBulkUpdateWhenAnyStockChangedMeanwhile() {
        Product product = buildProduct();
        ProductVariant unchanged = buildVariant(10L, product, "5-6 Yaş", "Haki", 5);
        // Panel 2 gosteriyordu; bu arada bir siparis 1 adet dustu.
        ProductVariant sold = buildVariant(11L, product, "6-7 Yaş", "Haki", 1);
        given(productVariantRepository.findAllByIdForUpdate(List.of(10L, 11L))).willReturn(List.of(unchanged, sold));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(unchanged, sold));

        assertThatThrownBy(() -> productVariantService.updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, null, 8, null, 5),
                new ProductVariantBulkUpdateRequest.Item(11L, null, 0, null, 2)
        )))
                .isInstanceOfSatisfying(StockConflictException.class, exception -> {
                    assertThat(exception.getConflicts())
                            .containsExactly(new StockConflictException.StockConflict(11L, 2, 1));
                    assertThat(exception.getMessage()).contains("6-7 Yaş / Haki stoğu 2 iken 1 oldu");
                });

        verify(productVariantRepository, never()).saveAll(any());
    }

    @Test
    void shouldLeaveStockAloneInBulkWhenTheRequestedValueIsWhatThePanelShowed() {
        Product product = buildProduct();
        // Panel 5 gosteriyordu (admin stoga dokunmadi, fiyati degistirdi); bu arada 1 adet satildi.
        ProductVariant variant = buildVariant(10L, product, "5-6 Yaş", "Haki", 4);
        given(productVariantRepository.findAllByIdForUpdate(List.of(10L))).willReturn(List.of(variant));
        given(productVariantRepository.findAllByProductIdIn(Set.of(1L))).willReturn(List.of(variant));

        productVariantService.updateProductVariants(List.of(
                new ProductVariantBulkUpdateRequest.Item(10L, null, 5, new BigDecimal("650.00"), 5)
        ));

        assertThat(variant.getStockQuantity()).isEqualTo(4);
        assertThat(variant.getPrice()).isEqualByComparingTo("650.00");
    }

    private Product buildProduct() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Kendinden Desenli Takım");
        return product;
    }

    private ProductVariant buildVariant(Long id, int stockQuantity) {
        ProductVariant variant = buildVariant(id, buildProduct(), "6-9 months", "Pink", stockQuantity);
        variant.setSku("SKU-1");
        return variant;
    }

    private ProductVariant buildVariant(Long id, Product product, String sizeLabel, String colorName, int stockQuantity) {
        ProductVariant variant = new ProductVariant();
        variant.setId(id);
        variant.setProduct(product);
        variant.setSizeLabel(sizeLabel);
        variant.setColorName(colorName);
        variant.setStockQuantity(stockQuantity);
        variant.setPrice(new BigDecimal("499.00"));
        variant.setCurrency("TRY");
        variant.setActive(true);
        return variant;
    }
}
