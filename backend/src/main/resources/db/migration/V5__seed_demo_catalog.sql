INSERT INTO categories (name, slug, description, is_active, sort_order)
VALUES
    ('Yenidogan', 'newborn', '0-12 ay icin yumusak ve pratik parcalar.', TRUE, 10),
    ('Bebek Kiz', 'baby-girl', 'Gundelik kullanim icin zarif bebek kiz urunleri.', TRUE, 20),
    ('Bebek Erkek', 'baby-boy', 'Rahat kesimli bebek erkek urunleri.', TRUE, 30),
    ('Kiz Cocuk', 'kids-girl', 'Hareketli gunlere uygun kiz cocuk parcalari.', TRUE, 40),
    ('Erkek Cocuk', 'kids-boy', 'Dayanikli ve konforlu erkek cocuk parcalari.', TRUE, 50)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, brand, is_active, created_at, updated_at)
SELECT
    c.id,
    seed.name,
    seed.slug,
    seed.description,
    seed.brand,
    TRUE,
    CURRENT_TIMESTAMP - (seed.display_order * INTERVAL '1 hour'),
    CURRENT_TIMESTAMP
FROM (
    VALUES
        ('newborn', 'Organik Zibin Seti', 'organik-zibin-seti', 'Organik pamuklu, citcitli ve gunluk kullanima uygun yenidogan seti.', 'MiniMori', 1),
        ('newborn', 'Muslin Uyku Tulumu', 'muslin-uyku-tulumu', 'Nefes alan muslin kumastan hafif uyku tulumu.', 'MiniMori', 2),
        ('baby-girl', 'Pudra Fistolu Elbise', 'pudra-fistolu-elbise', 'Ozel gunler ve fotograf cekimleri icin yumusak dokulu fistolu elbise.', 'MiniMori', 3),
        ('baby-girl', 'Keten Tulum', 'keten-tulum', 'Ilik havalar icin rahat kesimli keten tulum.', 'MiniMori', 4),
        ('baby-boy', 'Denim Salopet', 'denim-salopet', 'Ayarlanabilir askili, gunluk kullanima uygun denim salopet.', 'MiniMori', 5),
        ('baby-boy', 'Pamuklu Sweatshirt', 'pamuklu-sweatshirt', 'Yumusak ic dokulu, rahat kalip pamuklu sweatshirt.', 'MiniMori', 6),
        ('kids-girl', 'Cicek Desenli Elbise', 'cicek-desenli-elbise', 'Hafif kumasli, bahar gunleri icin cicek desenli elbise.', 'MiniMori', 7),
        ('kids-girl', 'Orgu Hirka', 'orgu-hirka', 'Serin havalar icin dokulu orgu hirka.', 'MiniMori', 8),
        ('kids-boy', 'Jogger Pantolon', 'jogger-pantolon', 'Esnek belli, hareket ozgurlugu sunan jogger pantolon.', 'MiniMori', 9),
        ('kids-boy', 'Bere ve Eldiven Seti', 'bere-ve-eldiven-seti', 'Soguk havalar icin tamamlayici bere ve eldiven seti.', 'MiniMori', 10)
) AS seed(category_slug, name, slug, description, brand, display_order)
JOIN categories c ON c.slug = seed.category_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
SELECT
    p.id,
    seed.image_url,
    seed.alt_text,
    seed.sort_order,
    seed.is_primary
FROM (
    VALUES
        ('organik-zibin-seti', 'https://placehold.co/900x1100/F2E6D6/5B4839?text=Organik+Zibin', 'Organik zibin seti', 0, TRUE),
        ('organik-zibin-seti', 'https://placehold.co/900x1100/E9DECF/5B4839?text=Zibin+Detay', 'Organik zibin seti detay', 1, FALSE),
        ('muslin-uyku-tulumu', 'https://placehold.co/900x1100/DFE8EF/5B4839?text=Muslin+Uyku+Tulumu', 'Muslin uyku tulumu', 0, TRUE),
        ('muslin-uyku-tulumu', 'https://placehold.co/900x1100/F2E6D6/5B4839?text=Muslin+Detay', 'Muslin uyku tulumu detay', 1, FALSE),
        ('pudra-fistolu-elbise', 'https://placehold.co/900x1100/F6E0DD/5B4839?text=Pudra+Elbise', 'Pudra fistolu elbise', 0, TRUE),
        ('pudra-fistolu-elbise', 'https://placehold.co/900x1100/E3B9B4/5B4839?text=Elbise+Detay', 'Pudra elbise detay', 1, FALSE),
        ('keten-tulum', 'https://placehold.co/900x1100/E9DECF/5B4839?text=Keten+Tulum', 'Keten tulum', 0, TRUE),
        ('keten-tulum', 'https://placehold.co/900x1100/DDCBB3/5B4839?text=Tulum+Detay', 'Keten tulum detay', 1, FALSE),
        ('denim-salopet', 'https://placehold.co/900x1100/DFE8EF/5B4839?text=Denim+Salopet', 'Denim salopet', 0, TRUE),
        ('denim-salopet', 'https://placehold.co/900x1100/BFD3E0/5B4839?text=Salopet+Detay', 'Denim salopet detay', 1, FALSE),
        ('pamuklu-sweatshirt', 'https://placehold.co/900x1100/E2EAD8/5B4839?text=Pamuklu+Sweatshirt', 'Pamuklu sweatshirt', 0, TRUE),
        ('pamuklu-sweatshirt', 'https://placehold.co/900x1100/C2D2AE/5B4839?text=Sweatshirt+Detay', 'Pamuklu sweatshirt detay', 1, FALSE),
        ('cicek-desenli-elbise', 'https://placehold.co/900x1100/F4E0DD/5B4839?text=Cicekli+Elbise', 'Cicek desenli elbise', 0, TRUE),
        ('cicek-desenli-elbise', 'https://placehold.co/900x1100/E6BFBA/5B4839?text=Cicek+Detay', 'Cicek desenli elbise detay', 1, FALSE),
        ('orgu-hirka', 'https://placehold.co/900x1100/EFE6D7/5B4839?text=Orgu+Hirka', 'Orgu hirka', 0, TRUE),
        ('orgu-hirka', 'https://placehold.co/900x1100/D2BCA2/5B4839?text=Hirka+Detay', 'Orgu hirka detay', 1, FALSE),
        ('jogger-pantolon', 'https://placehold.co/900x1100/DCE7EE/5B4839?text=Jogger+Pantolon', 'Jogger pantolon', 0, TRUE),
        ('jogger-pantolon', 'https://placehold.co/900x1100/BFD3E0/5B4839?text=Jogger+Detay', 'Jogger pantolon detay', 1, FALSE),
        ('bere-ve-eldiven-seti', 'https://placehold.co/900x1100/E9DECF/5B4839?text=Bere+Eldiven', 'Bere ve eldiven seti', 0, TRUE),
        ('bere-ve-eldiven-seti', 'https://placehold.co/900x1100/DDCBB3/5B4839?text=Aksesuar+Detay', 'Bere ve eldiven seti detay', 1, FALSE)
) AS seed(product_slug, image_url, alt_text, sort_order, is_primary)
JOIN products p ON p.slug = seed.product_slug
WHERE NOT EXISTS (
    SELECT 1
    FROM product_images existing
    WHERE existing.product_id = p.id
      AND existing.image_url = seed.image_url
);

INSERT INTO product_variants (product_id, sku, size_label, color_name, stock_quantity, price, currency, is_active)
SELECT
    p.id,
    seed.sku,
    seed.size_label,
    seed.color_name,
    seed.stock_quantity,
    seed.price,
    'TRY',
    TRUE
FROM (
    VALUES
        ('organik-zibin-seti', 'MM-OZS-03-YUL', '0-3A', 'Yulaf', 18, 449.00),
        ('organik-zibin-seti', 'MM-OZS-36-YUL', '3-6A', 'Yulaf', 14, 449.00),
        ('organik-zibin-seti', 'MM-OZS-612-BYZ', '6-12A', 'Beyaz', 12, 479.00),
        ('muslin-uyku-tulumu', 'MM-MUT-03-BYZ', '0-3A', 'Beyaz', 10, 599.00),
        ('muslin-uyku-tulumu', 'MM-MUT-36-YUL', '3-6A', 'Yulaf', 12, 599.00),
        ('muslin-uyku-tulumu', 'MM-MUT-612-VIZ', '6-12A', 'Vizon', 8, 629.00),
        ('pudra-fistolu-elbise', 'MM-PFE-612-PUD', '6-12A', 'Pudra', 9, 749.00),
        ('pudra-fistolu-elbise', 'MM-PFE-1218-PUD', '12-18A', 'Pudra', 11, 749.00),
        ('pudra-fistolu-elbise', 'MM-PFE-1824-BYZ', '18-24A', 'Beyaz', 7, 779.00),
        ('keten-tulum', 'MM-KT-612-YUL', '6-12A', 'Yulaf', 15, 699.00),
        ('keten-tulum', 'MM-KT-1218-VIZ', '12-18A', 'Vizon', 13, 699.00),
        ('keten-tulum', 'MM-KT-1824-KHV', '18-24A', 'Kahve', 8, 729.00),
        ('denim-salopet', 'MM-DS-612-BYZ', '6-12A', 'Beyaz', 10, 799.00),
        ('denim-salopet', 'MM-DS-1218-YUL', '12-18A', 'Yulaf', 12, 799.00),
        ('denim-salopet', 'MM-DS-1824-KHV', '18-24A', 'Kahve', 9, 829.00),
        ('pamuklu-sweatshirt', 'MM-PS-1218-YUL', '12-18A', 'Yulaf', 18, 549.00),
        ('pamuklu-sweatshirt', 'MM-PS-1824-VIZ', '18-24A', 'Vizon', 16, 549.00),
        ('pamuklu-sweatshirt', 'MM-PS-23-KHV', '2-3Y', 'Kahve', 10, 579.00),
        ('cicek-desenli-elbise', 'MM-CDE-23-PUD', '2-3Y', 'Pudra', 8, 899.00),
        ('cicek-desenli-elbise', 'MM-CDE-34-BYZ', '3-4Y', 'Beyaz', 11, 899.00),
        ('cicek-desenli-elbise', 'MM-CDE-45-PUD', '4-5Y', 'Pudra', 7, 929.00),
        ('orgu-hirka', 'MM-OH-23-YUL', '2-3Y', 'Yulaf', 14, 649.00),
        ('orgu-hirka', 'MM-OH-34-VIZ', '3-4Y', 'Vizon', 12, 649.00),
        ('orgu-hirka', 'MM-OH-45-KHV', '4-5Y', 'Kahve', 9, 679.00),
        ('jogger-pantolon', 'MM-JP-23-VIZ', '2-3Y', 'Vizon', 15, 499.00),
        ('jogger-pantolon', 'MM-JP-34-KHV', '3-4Y', 'Kahve', 13, 499.00),
        ('jogger-pantolon', 'MM-JP-45-YUL', '4-5Y', 'Yulaf', 10, 529.00),
        ('bere-ve-eldiven-seti', 'MM-BES-1218-YUL', '12-18A', 'Yulaf', 20, 349.00),
        ('bere-ve-eldiven-seti', 'MM-BES-23-VIZ', '2-3Y', 'Vizon', 18, 349.00),
        ('bere-ve-eldiven-seti', 'MM-BES-34-KHV', '3-4Y', 'Kahve', 15, 379.00)
) AS seed(product_slug, sku, size_label, color_name, stock_quantity, price)
JOIN products p ON p.slug = seed.product_slug
ON CONFLICT (product_id, size_label, color_name) DO NOTHING;
