-- Sepet ve siparis kalemlerinin varyant referanslari icin indeks. Bir varyant silinirken PostgreSQL
-- bu tablolarda o varyanta bakan satirlari arar (sepet: kisit kontrolu, siparis: ON DELETE SET NULL);
-- indeks olmadan her silinen varyant icin iki tablo bastan sona taranir.
CREATE INDEX IF NOT EXISTS idx_cart_items_product_variant_id ON cart_items (product_variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_variant_id ON order_items (product_variant_id);
