INSERT INTO categories (name, slug, description, is_active, sort_order)
VALUES
    ('Yenidoğan', 'yenidogan', 'İlk aylar için yumuşak ve güvenli yenidoğan parçaları.', TRUE, 10),
    ('Kız Bebek', 'kiz-bebek', 'Kız bebekler için zarif, rahat ve yumuşak parçalar.', TRUE, 20),
    ('Erkek Bebek', 'erkek-bebek', 'Erkek bebekler için pratik, rahat ve yumuşak parçalar.', TRUE, 30),
    ('Kız Çocuk', 'kiz-cocuk', 'Kız çocuklar için günlük ve özel gün parçaları.', TRUE, 40),
    ('Erkek Çocuk', 'erkek-cocuk', 'Erkek çocuklar için rahat ve dayanıklı parçalar.', TRUE, 50)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'yenidogan')
WHERE category_id IN (
    SELECT id FROM categories WHERE slug IN ('newborn', 'yeni-dogan')
);

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'kiz-bebek')
WHERE category_id IN (
    SELECT id FROM categories WHERE slug = 'baby-girl'
);

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'erkek-bebek')
WHERE category_id IN (
    SELECT id FROM categories WHERE slug = 'baby-boy'
);

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'kiz-cocuk')
WHERE category_id IN (
    SELECT id FROM categories WHERE slug = 'kids-girl'
);

UPDATE products
SET category_id = (SELECT id FROM categories WHERE slug = 'erkek-cocuk')
WHERE category_id IN (
    SELECT id FROM categories WHERE slug = 'kids-boy'
);

DELETE FROM categories
WHERE slug IN ('newborn', 'yeni-dogan', 'baby-girl', 'baby-boy', 'kids-girl', 'kids-boy');
