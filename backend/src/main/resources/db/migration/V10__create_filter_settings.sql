CREATE TABLE IF NOT EXISTS storefront_filter_settings (
    filter_key VARCHAR(80) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO storefront_filter_settings (filter_key, label, is_enabled, sort_order)
VALUES
    ('category', 'Kategori', TRUE, 10),
    ('productType', 'Urun Tipi', TRUE, 20),
    ('size', 'Beden', TRUE, 30),
    ('color', 'Renk', TRUE, 40),
    ('price', 'Fiyat', TRUE, 50)
ON CONFLICT (filter_key) DO NOTHING;
