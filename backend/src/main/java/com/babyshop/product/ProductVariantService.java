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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductVariantService {

    private static final String DEFAULT_CURRENCY = "TRY";
    private static final Locale TURKISH = Locale.forLanguageTag("tr-TR");
    private static final int MAX_LISTED_CONFLICTS = 5;

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CartItemRepository cartItemRepository;

    public List<ProductVariantResponse> getProductVariants(Long productId) {
        ensureProductExists(productId);

        return productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(productId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductVariantResponse createProductVariant(Long productId, ProductVariantAdminRequest request) {
        Product product = findProduct(productId);
        validateOptionComboForCreate(productId, request.sizeLabel(), request.colorName());
        validateSkuForCreate(request.sku());

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        applyAttributes(variant, request);
        variant.setStockQuantity(request.stockQuantity());

        return toResponse(productVariantRepository.save(variant));
    }

    // Mevcut urune yeni beden/renk kombinasyonlari ekler; hepsi tek transaction'da olusur (biri
    // gecersizse hicbiri eklenmez). SKU sunucuda uretilir, para birimi urunun varyantlarindan alinir.
    @Transactional
    public List<ProductVariantResponse> createProductVariants(Long productId, List<ProductVariantBulkCreateRequest.Item> items) {
        Product product = findProduct(productId);
        List<ProductVariant> existing = productVariantRepository.findAllByProductIdOrderBySizeLabelAscColorNameAsc(productId);

        Set<String> combos = new HashSet<>();
        existing.forEach(variant -> combos.add(variant.getSizeLabel() + "|" + variant.getColorName()));
        String currency = existing.stream()
                .map(ProductVariant::getCurrency)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(DEFAULT_CURRENCY);
        String skuToken = newSkuToken();
        Set<String> usedSkus = new HashSet<>();

        List<ProductVariant> created = new ArrayList<>();
        for (ProductVariantBulkCreateRequest.Item item : items) {
            String sizeLabel = item.sizeLabel().trim();
            String colorName = item.colorName().trim();
            if (!combos.add(sizeLabel + "|" + colorName)) {
                throw new DuplicateResourceException("\"" + product.getName() + "\" ürününde \""
                        + sizeLabel + " / " + colorName + "\" zaten var.");
            }

            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku(uniqueSku(product.getName(), colorName, sizeLabel, skuToken, usedSkus));
            variant.setSizeLabel(sizeLabel);
            variant.setColorName(colorName);
            variant.setStockQuantity(item.stockQuantity());
            variant.setPrice(item.price());
            variant.setCompareAtPrice(item.compareAtPrice());
            variant.setCurrency(currency);
            variant.setActive(true);
            created.add(variant);
        }

        return productVariantRepository.saveAll(created).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductVariantResponse updateProductVariant(Long productId, Long variantId, ProductVariantAdminRequest request) {
        ProductVariant variant = findProductVariantForUpdate(productId, variantId);
        validateOptionComboForUpdate(productId, variantId, request.sizeLabel(), request.colorName());
        validateSkuForUpdate(variantId, request.sku());
        applyStockOrThrow(variant, request.stockQuantity(), request.expectedStockQuantity());
        applyAttributes(variant, request);

        return toResponse(productVariantRepository.save(variant));
    }

    @Transactional
    public ProductVariantResponse updateProductVariantStock(
            Long productId,
            Long variantId,
            int stockQuantity,
            Integer expectedStockQuantity
    ) {
        ProductVariant variant = findProductVariantForUpdate(productId, variantId);
        applyStockOrThrow(variant, stockQuantity, expectedStockQuantity);

        return toResponse(productVariantRepository.save(variant));
    }

    // Toplu guncelleme: farkli urunlerin varyantlari ayni istekte degisebilir; hepsi tek transaction'da
    // yazilir (biri gecersizse hicbiri kaydedilmez). Kalemde null birakilan alan degismez.
    @Transactional
    public List<ProductVariantResponse> updateProductVariants(List<ProductVariantBulkUpdateRequest.Item> items) {
        Map<Long, ProductVariantBulkUpdateRequest.Item> itemsById = new LinkedHashMap<>();
        for (ProductVariantBulkUpdateRequest.Item item : items) {
            if (itemsById.putIfAbsent(item.id(), item) != null) {
                throw new InvalidRequestException("Aynı varyant istekte birden fazla kez gönderildi: " + item.id());
            }
        }

        Map<Long, ProductVariant> targetsById = findAllVariantsForUpdate(List.copyOf(itemsById.keySet())).stream()
                .collect(Collectors.toMap(ProductVariant::getId, variant -> variant));

        // Urunlerin diger varyantlari da yuklenir (ayni managed nesneler): beden degisince
        // beden/renk kombinasyonunun urun icinde tekil kaldigi, veritabanina yazmadan dogrulanir.
        Set<Long> productIds = targetsById.values().stream()
                .map(variant -> variant.getProduct().getId())
                .collect(Collectors.toSet());
        List<ProductVariant> siblings = productVariantRepository.findAllByProductIdIn(productIds);

        List<StockConflictException.StockConflict> conflicts = new ArrayList<>();
        List<String> conflictDescriptions = new ArrayList<>();
        Map<Long, String> previousSizeLabels = new HashMap<>();
        for (ProductVariantBulkUpdateRequest.Item item : itemsById.values()) {
            ProductVariant variant = targetsById.get(item.id());
            StockConflictException.StockConflict conflict =
                    applyStock(variant, item.stockQuantity(), item.expectedStockQuantity());
            if (conflict != null) {
                conflicts.add(conflict);
                conflictDescriptions.add(describeStockConflict(variant, conflict));
            }
            if (item.sizeLabel() != null) {
                String sizeLabel = item.sizeLabel().trim();
                if (sizeLabel.isEmpty()) {
                    throw new InvalidRequestException("Beden/yaş boş olamaz.");
                }
                if (!sizeLabel.equals(variant.getSizeLabel())) {
                    previousSizeLabels.put(variant.getId(), variant.getSizeLabel());
                    variant.setSizeLabel(sizeLabel);
                }
            }
            if (item.price() != null) {
                variant.setPrice(item.price());
            }
        }
        if (!conflicts.isEmpty()) {
            throw stockConflict(conflicts, conflictDescriptions);
        }

        ensureUniqueOptionCombos(siblings);
        writeRenamesWithoutTransientConflicts(targetsById, previousSizeLabels);
        productVariantRepository.saveAll(targetsById.values());

        return itemsById.keySet().stream()
                .map(id -> toResponse(targetsById.get(id)))
                .toList();
    }

    @Transactional
    public void deleteProductVariant(Long productId, Long variantId) {
        findProductVariant(productId, variantId);
        deleteProductVariants(List.of(variantId));
    }

    // Kalici silme. Siparis gecmisi etkilenmez: siparis kalemleri urun adini, beden/renk etiketini
    // ve fiyati kendi satirinda tutar; varyant baglantisi veritabaninda NULL'a cekilir.
    @Transactional
    public void deleteProductVariants(Collection<Long> variantIds) {
        List<Long> ids = variantIds.stream().distinct().toList();
        List<ProductVariant> variants = findAllVariants(ids);

        Set<Long> deleting = new HashSet<>(ids);
        Set<Long> productIds = variants.stream()
                .map(variant -> variant.getProduct().getId())
                .collect(Collectors.toSet());
        Map<Long, List<ProductVariant>> siblingsByProduct = productVariantRepository.findAllByProductIdIn(productIds).stream()
                .collect(Collectors.groupingBy(variant -> variant.getProduct().getId()));

        // Satilabilir varyanti kalmayan urun magazada fiyatsiz/bedensiz gorunur. Bu yuzden urunun
        // son varyanti silinemez; urunde aktif varyant varsa silmeden sonra da en az biri kalmalidir
        // (geride yalnizca pasif varyant kalmasi, admin listelerinde gorunmedigi icin fark edilmez).
        for (ProductVariant variant : variants) {
            List<ProductVariant> siblings = siblingsByProduct.getOrDefault(variant.getProduct().getId(), List.of());
            List<ProductVariant> remaining = siblings.stream()
                    .filter(sibling -> !deleting.contains(sibling.getId()))
                    .toList();
            boolean hadActive = siblings.stream().anyMatch(ProductVariant::isActive);
            if (remaining.isEmpty() || (hadActive && remaining.stream().noneMatch(ProductVariant::isActive))) {
                throw new InvalidRequestException("\"" + variant.getProduct().getName()
                        + "\" ürününün tüm varyantları silinemez; satışta en az bir varyant kalmalı. "
                        + "Ürünü tamamen kaldırmak için ürünü silin.");
            }
        }

        cartItemRepository.deleteAllByProductVariantIds(ids);
        productVariantRepository.deleteAllByIdIn(ids);
    }

    // Stok disindaki alanlar; stok, olusturmada dogrudan, guncellemede applyStockOrThrow ile yazilir.
    private void applyAttributes(ProductVariant variant, ProductVariantAdminRequest request) {
        variant.setSku(normalizeSku(request.sku()));
        variant.setSizeLabel(request.sizeLabel().trim());
        variant.setColorName(request.colorName().trim());
        variant.setPrice(request.price());
        variant.setCompareAtPrice(request.compareAtPrice());
        variant.setCurrency(request.currency().trim().toUpperCase());
        variant.setActive(request.active());
    }

    // Stok, panelin gordugu degerle karsilastirilarak yazilir: admin sayfayi actiktan sonra bir siparis
    // stogu dusurduyse (ya da iptal geri verdiyse), panelde kalan eski sayi bu degisikligi ezmemeli.
    //  - expected yoksa (eski istemciler) istenen deger oldugu gibi yazilir;
    //  - istenen deger panelin gordugu degerle ayniysa admin stoga dokunmamistir; stok degismez;
    //  - veritabanindaki stok panelin gordugu degerden farkliysa cakisma dondurulur, yazilmaz.
    // Varyant satiri kilitli okundugu icin karsilastirma ile yazim arasina siparis giremez.
    private StockConflictException.StockConflict applyStock(ProductVariant variant, Integer requested, Integer expected) {
        if (requested == null) {
            return null;
        }
        if (expected == null) {
            variant.setStockQuantity(requested);
            return null;
        }
        if (requested.equals(expected)) {
            return null;
        }
        if (variant.getStockQuantity() != expected) {
            return new StockConflictException.StockConflict(variant.getId(), expected, variant.getStockQuantity());
        }
        variant.setStockQuantity(requested);
        return null;
    }

    private void applyStockOrThrow(ProductVariant variant, Integer requested, Integer expected) {
        StockConflictException.StockConflict conflict = applyStock(variant, requested, expected);
        if (conflict != null) {
            throw stockConflict(List.of(conflict), List.of(describeStockConflict(variant, conflict)));
        }
    }

    private String describeStockConflict(ProductVariant variant, StockConflictException.StockConflict conflict) {
        return "\"" + variant.getProduct().getName() + "\" " + variant.getSizeLabel() + " / " + variant.getColorName()
                + " stoğu " + conflict.expectedStockQuantity() + " iken " + conflict.currentStockQuantity() + " oldu";
    }

    private StockConflictException stockConflict(
            List<StockConflictException.StockConflict> conflicts,
            List<String> descriptions
    ) {
        String listed = String.join("; ", descriptions.subList(0, Math.min(descriptions.size(), MAX_LISTED_CONFLICTS)));
        int more = descriptions.size() - MAX_LISTED_CONFLICTS;
        return new StockConflictException(
                "Siz düzenlerken stok değişti (arada sipariş gelmiş ya da iptal edilmiş olabilir): " + listed
                        + (more > 0 ? " ve " + more + " varyant daha" : "")
                        + ". Hiçbir değişiklik kaydedilmedi.",
                conflicts
        );
    }

    // SKU yeni urun eklerken panelin urettigi bicimdedir: urun adinin bas harfleri, renk, beden ve
    // istege ozel kisa bir kod (orn. KDT-HAKI-78YAS-K3F9). Alinmissa -2, -3 ... eklenir.
    private String uniqueSku(String productName, String colorName, String sizeLabel, String token, Set<String> usedSkus) {
        String productPart = Arrays.stream(skuSlug(productName).split("-"))
                .filter(part -> !part.isEmpty())
                .map(part -> part.substring(0, 1))
                .collect(Collectors.joining());
        productPart = productPart.isEmpty() ? "urn" : productPart.substring(0, Math.min(productPart.length(), 5));
        String colorPart = skuSlug(colorName).replace("-", "");
        colorPart = colorPart.isEmpty() ? "renk" : colorPart.substring(0, Math.min(colorPart.length(), 6));
        String sizePart = skuSlug(sizeLabel).replace("-", "");
        sizePart = sizePart.isEmpty() ? "beden" : sizePart.substring(0, Math.min(sizePart.length(), 6));

        String base = (productPart + "-" + colorPart + "-" + sizePart + "-" + token).toUpperCase(Locale.ROOT);
        String sku = base;
        for (int suffix = 2; usedSkus.contains(sku) || productVariantRepository.existsBySku(sku); suffix++) {
            sku = base + "-" + suffix;
        }
        usedSkus.add(sku);
        return sku;
    }

    private static String skuSlug(String value) {
        return value.trim()
                .toLowerCase(TURKISH)
                .replace('ğ', 'g')
                .replace('ü', 'u')
                .replace('ş', 's')
                .replace('ı', 'i')
                .replace('ö', 'o')
                .replace('ç', 'c')
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private static String newSkuToken() {
        String token = Integer.toString(ThreadLocalRandom.current().nextInt(36 * 36 * 36 * 36), 36);
        return "0".repeat(4 - token.length()) + token;
    }

    private void validateOptionComboForCreate(Long productId, String sizeLabel, String colorName) {
        if (productVariantRepository.existsByProductIdAndSizeLabelAndColorName(
                productId,
                sizeLabel.trim(),
                colorName.trim()
        )) {
            throw new DuplicateResourceException("Product variant already exists for size/color combination");
        }
    }

    private void validateOptionComboForUpdate(Long productId, Long variantId, String sizeLabel, String colorName) {
        if (productVariantRepository.existsByProductIdAndSizeLabelAndColorNameAndIdNot(
                productId,
                sizeLabel.trim(),
                colorName.trim(),
                variantId
        )) {
            throw new DuplicateResourceException("Product variant already exists for size/color combination");
        }
    }

    private void ensureUniqueOptionCombos(List<ProductVariant> variants) {
        Set<String> seen = new HashSet<>();
        for (ProductVariant variant : variants) {
            if (!seen.add(optionComboKey(variant, variant.getSizeLabel()))) {
                throw new DuplicateResourceException("\"" + variant.getProduct().getName() + "\" ürününde \""
                        + variant.getSizeLabel() + " / " + variant.getColorName() + "\" birden fazla olamaz.");
            }
        }
    }

    // Zincirleme yeniden adlandirmada (A->B ve ayni istekte B->C) UPDATE'lerin sirasi, son durum gecerli
    // olsa bile tekil kisiti (urun, beden, renk) arada cigneyebilir. Boyle bir durumda once gecici
    // etiketler yazilir, asil etiketler transaction sonunda yazilir.
    private void writeRenamesWithoutTransientConflicts(
            Map<Long, ProductVariant> targetsById,
            Map<Long, String> previousSizeLabels
    ) {
        Set<String> vacatedCombos = previousSizeLabels.entrySet().stream()
                .map(entry -> optionComboKey(targetsById.get(entry.getKey()), entry.getValue()))
                .collect(Collectors.toSet());
        boolean chained = previousSizeLabels.keySet().stream()
                .map(targetsById::get)
                .anyMatch(variant -> vacatedCombos.contains(optionComboKey(variant, variant.getSizeLabel())));
        if (!chained) {
            return;
        }

        List<ProductVariant> renamed = previousSizeLabels.keySet().stream().map(targetsById::get).toList();
        Map<Long, String> finalSizeLabels = renamed.stream()
                .collect(Collectors.toMap(ProductVariant::getId, ProductVariant::getSizeLabel));
        renamed.forEach(variant -> variant.setSizeLabel("~" + variant.getId()));
        productVariantRepository.saveAllAndFlush(renamed);
        renamed.forEach(variant -> variant.setSizeLabel(finalSizeLabels.get(variant.getId())));
    }

    private String optionComboKey(ProductVariant variant, String sizeLabel) {
        return variant.getProduct().getId() + "|" + sizeLabel + "|" + variant.getColorName();
    }

    private void validateSkuForCreate(String sku) {
        String normalizedSku = normalizeSku(sku);
        if (normalizedSku != null && productVariantRepository.existsBySku(normalizedSku)) {
            throw new DuplicateResourceException("Product variant SKU already exists: " + normalizedSku);
        }
    }

    private void validateSkuForUpdate(Long variantId, String sku) {
        String normalizedSku = normalizeSku(sku);
        if (normalizedSku != null && productVariantRepository.existsBySkuAndIdNot(normalizedSku, variantId)) {
            throw new DuplicateResourceException("Product variant SKU already exists: " + normalizedSku);
        }
    }

    private String normalizeSku(String sku) {
        if (sku == null || sku.trim().isEmpty()) {
            return null;
        }

        return sku.trim();
    }

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found for id: " + productId));
    }

    private void ensureProductExists(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found for id: " + productId);
        }
    }

    private ProductVariant findProductVariant(Long productId, Long variantId) {
        return productVariantRepository.findByIdAndProductId(variantId, productId)
                .orElseThrow(() -> variantNotFound(productId, variantId));
    }

    private ProductVariant findProductVariantForUpdate(Long productId, Long variantId) {
        return productVariantRepository.findByIdAndProductIdForUpdate(variantId, productId)
                .orElseThrow(() -> variantNotFound(productId, variantId));
    }

    private ResourceNotFoundException variantNotFound(Long productId, Long variantId) {
        return new ResourceNotFoundException(
                "Product variant not found for product id: " + productId + " and variant id: " + variantId
        );
    }

    private List<ProductVariant> findAllVariants(List<Long> ids) {
        return requireAll(ids, productVariantRepository.findAllById(ids));
    }

    private List<ProductVariant> findAllVariantsForUpdate(List<Long> ids) {
        return requireAll(ids, productVariantRepository.findAllByIdForUpdate(ids));
    }

    private List<ProductVariant> requireAll(List<Long> ids, List<ProductVariant> variants) {
        if (variants.size() != ids.size()) {
            Set<Long> found = variants.stream().map(ProductVariant::getId).collect(Collectors.toSet());
            List<Long> missing = new ArrayList<>(ids);
            missing.removeAll(found);
            throw new ResourceNotFoundException("Product variant not found for ids: " + missing);
        }

        return variants;
    }

    private ProductVariantResponse toResponse(ProductVariant variant) {
        return new ProductVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getSizeLabel(),
                variant.getColorName(),
                variant.getStockQuantity(),
                variant.getPrice(),
                variant.getCompareAtPrice(),
                variant.getCurrency(),
                variant.isActive()
        );
    }
}
