INSERT INTO categories (name, slug, description, is_active, sort_order)
VALUES
    ('Newborn', 'newborn', 'Soft essentials for the very first months.', TRUE, 10),
    ('Baby Girl', 'baby-girl', 'Delicate dresses and cozy layers for baby girls.', TRUE, 20),
    ('Baby Boy', 'baby-boy', 'Playful and practical pieces for baby boys.', TRUE, 30)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, brand, is_active)
SELECT c.id,
       'Knit Button Cardigan',
       'knit-button-cardigan',
       'A lightweight knit cardigan with gentle texture and wooden-look buttons for everyday layering.',
       'MiniMori',
       TRUE
FROM categories c
WHERE c.slug = 'newborn'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, brand, is_active)
SELECT c.id,
       'Floral Ruffle Dress',
       'floral-ruffle-dress',
       'A soft cotton dress with an airy floral pattern and subtle ruffle details for special little moments.',
       'MiniMori',
       TRUE
FROM categories c
WHERE c.slug = 'baby-girl'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, brand, is_active)
SELECT c.id,
       'Organic Cotton Romper',
       'organic-cotton-romper',
       'A breathable sleeveless romper designed for easy movement and all-day comfort.',
       'MiniMori',
       TRUE
FROM categories c
WHERE c.slug = 'baby-boy'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id,
       'https://placehold.co/800x1000/f3e7db/6f5448.png?text=Knit+Button+Cardigan',
       'Knit Button Cardigan front view',
       0,
       TRUE
FROM products p
WHERE p.slug = 'knit-button-cardigan'
  AND NOT EXISTS (
      SELECT 1
      FROM product_images i
      WHERE i.product_id = p.id
        AND i.image_url = 'https://placehold.co/800x1000/f3e7db/6f5448.png?text=Knit+Button+Cardigan'
  );

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id,
       'https://placehold.co/800x1000/f8dfd6/7a5649.png?text=Floral+Ruffle+Dress',
       'Floral Ruffle Dress front view',
       0,
       TRUE
FROM products p
WHERE p.slug = 'floral-ruffle-dress'
  AND NOT EXISTS (
      SELECT 1
      FROM product_images i
      WHERE i.product_id = p.id
        AND i.image_url = 'https://placehold.co/800x1000/f8dfd6/7a5649.png?text=Floral+Ruffle+Dress'
  );

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id,
       'https://placehold.co/800x1000/dcecf6/5b6d7a.png?text=Organic+Cotton+Romper',
       'Organic Cotton Romper front view',
       0,
       TRUE
FROM products p
WHERE p.slug = 'organic-cotton-romper'
  AND NOT EXISTS (
      SELECT 1
      FROM product_images i
      WHERE i.product_id = p.id
        AND i.image_url = 'https://placehold.co/800x1000/dcecf6/5b6d7a.png?text=Organic+Cotton+Romper'
  );

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT p.id, 'MMC-CARDI-03-OAT', '0-3M', 'Oatmeal', 14, 38.00, 'USD', TRUE
FROM products p
WHERE p.slug = 'knit-button-cardigan'
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT p.id, 'MMC-CARDI-36-OAT', '3-6M', 'Oatmeal', 10, 38.00, 'USD', TRUE
FROM products p
WHERE p.slug = 'knit-button-cardigan'
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT p.id, 'MMC-DRESS-612-ROSE', '6-12M', 'Soft Rose', 8, 44.00, 'USD', TRUE
FROM products p
WHERE p.slug = 'floral-ruffle-dress'
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT p.id, 'MMC-DRESS-12-18-ROSE', '12-18M', 'Soft Rose', 6, 46.00, 'USD', TRUE
FROM products p
WHERE p.slug = 'floral-ruffle-dress'
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT p.id, 'MMC-ROMPER-36-SKY', '3-6M', 'Sky Blue', 11, 32.00, 'USD', TRUE
FROM products p
WHERE p.slug = 'organic-cotton-romper'
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT p.id, 'MMC-ROMPER-69-SKY', '6-9M', 'Sky Blue', 9, 32.00, 'USD', TRUE
FROM products p
WHERE p.slug = 'organic-cotton-romper'
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;
