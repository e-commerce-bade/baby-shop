-- Magaza geneli ayarlar (tek satir). Kargo ucreti ve ucretsiz kargo esigi
-- admin panelden duzenlenebilir; sepet ozeti ve siparis bu degerleri kullanir.
CREATE TABLE IF NOT EXISTS store_settings (
    id SMALLINT PRIMARY KEY,
    free_shipping_threshold NUMERIC(12, 2) NOT NULL,
    shipping_fee NUMERIC(12, 2) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT store_settings_singleton CHECK (id = 1)
);

INSERT INTO store_settings (id, free_shipping_threshold, shipping_fee)
VALUES (1, 1500.00, 49.90)
ON CONFLICT (id) DO NOTHING;
