-- Gercek indirim destegi: varyantin indirimsiz (eski) fiyati. NULL ise indirim yoktur.
-- Frontend yalnizca compare_at_price > price oldugunda ustu cizili fiyat/indirim rozeti gosterir.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 2);

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variant_compare_at_price_non_negative;
ALTER TABLE product_variants ADD CONSTRAINT chk_variant_compare_at_price_non_negative
    CHECK (compare_at_price IS NULL OR compare_at_price >= 0);
