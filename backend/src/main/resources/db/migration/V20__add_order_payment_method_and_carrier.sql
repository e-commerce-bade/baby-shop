-- Siparise odeme yontemi (CARD/COD/EFT), kapida odeme farki ve secilen kargo firmasi eklenir.
-- Mevcut siparisler kart ile odenmis kabul edilir (payment_method = 'CARD').
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CARD',
    ADD COLUMN IF NOT EXISTS cod_surcharge NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(80);

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_cod_surcharge_non_negative CHECK (cod_surcharge >= 0);
