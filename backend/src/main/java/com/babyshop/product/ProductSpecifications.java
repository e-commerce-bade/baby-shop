package com.babyshop.product;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Storefront urun listesi icin filtre + siralama specification'i.
 * Renk/beden EXISTS alt-sorgulariyla, fiyat araligi ise aktif varyantlarin
 * minimum fiyatina gore (alt-sorgu) uygulanir; siralama da ayni min fiyata gore yapilir.
 */
public final class ProductSpecifications {

    public static final String SORT_PRICE_ASC = "price-asc";
    public static final String SORT_PRICE_DESC = "price-desc";

    private static final BigDecimal PRICE_LOW = new BigDecimal("500");
    private static final BigDecimal PRICE_HIGH = new BigDecimal("700");

    private ProductSpecifications() {
    }

    public record Criteria(
            String categorySlug,
            String query,
            List<String> productTypes,
            List<String> colors,
            List<String> sizes,
            String priceBucket,
            String sort
    ) {
    }

    public static Specification<Product> matching(Criteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));

            if (hasText(criteria.categorySlug())) {
                predicates.add(cb.equal(root.get("category").get("slug"), criteria.categorySlug().trim()));
            }

            if (hasText(criteria.query())) {
                String like = "%" + criteria.query().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("brand")), like),
                        cb.like(cb.lower(root.get("category").get("name")), like)
                ));
            }

            if (!isEmpty(criteria.productTypes())) {
                predicates.add(root.get("productType").in(criteria.productTypes()));
            }

            if (!isEmpty(criteria.colors())) {
                predicates.add(variantValueExists(root, query, cb, "colorName", criteria.colors()));
            }

            if (!isEmpty(criteria.sizes())) {
                predicates.add(variantValueExists(root, query, cb, "sizeLabel", criteria.sizes()));
            }

            Predicate pricePredicate = pricePredicate(root, query, cb, criteria.priceBucket());
            if (pricePredicate != null) {
                predicates.add(pricePredicate);
            }

            // Siralama: count sorgusunda ORDER BY gereksiz/sorunlu; yalniz veri sorgusunda uygula.
            if (Long.class != query.getResultType() && long.class != query.getResultType()) {
                if (SORT_PRICE_ASC.equalsIgnoreCase(criteria.sort())) {
                    query.orderBy(cb.asc(minActiveVariantPrice(root, query, cb)));
                } else if (SORT_PRICE_DESC.equalsIgnoreCase(criteria.sort())) {
                    query.orderBy(cb.desc(minActiveVariantPrice(root, query, cb)));
                } else {
                    query.orderBy(cb.desc(root.get("createdAt")));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate variantValueExists(
            Root<Product> root,
            jakarta.persistence.criteria.CriteriaQuery<?> query,
            CriteriaBuilder cb,
            String field,
            List<String> values
    ) {
        Subquery<Long> sub = query.subquery(Long.class);
        Root<ProductVariant> variant = sub.from(ProductVariant.class);
        sub.select(cb.literal(1L));
        sub.where(
                cb.equal(variant.get("product"), root),
                cb.isTrue(variant.get("active")),
                variant.get(field).in(values)
        );
        return cb.exists(sub);
    }

    private static Expression<BigDecimal> minActiveVariantPrice(
            Root<Product> root,
            jakarta.persistence.criteria.CriteriaQuery<?> query,
            CriteriaBuilder cb
    ) {
        Subquery<BigDecimal> sub = query.subquery(BigDecimal.class);
        Root<ProductVariant> variant = sub.from(ProductVariant.class);
        sub.select(cb.min(variant.get("price")));
        sub.where(
                cb.equal(variant.get("product"), root),
                cb.isTrue(variant.get("active"))
        );
        return sub;
    }

    private static Predicate pricePredicate(
            Root<Product> root,
            jakarta.persistence.criteria.CriteriaQuery<?> query,
            CriteriaBuilder cb,
            String bucket
    ) {
        if (!hasText(bucket)) {
            return null;
        }

        Expression<BigDecimal> minPrice = minActiveVariantPrice(root, query, cb);
        return switch (bucket.trim().toLowerCase(Locale.ROOT)) {
            case "under-500" -> cb.lessThan(minPrice, PRICE_LOW);
            case "500-700" -> cb.between(minPrice, PRICE_LOW, PRICE_HIGH);
            case "over-700" -> cb.greaterThan(minPrice, PRICE_HIGH);
            default -> null;
        };
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static boolean isEmpty(List<String> values) {
        return values == null || values.isEmpty();
    }
}
