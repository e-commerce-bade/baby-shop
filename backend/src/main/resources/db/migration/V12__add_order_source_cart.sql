-- Siparisi olusturan sepeti referansla; odeme basariyla tamamlaninca bu sepet
-- CHECKED_OUT olarak isaretlenir (ayni sepetten tekrar tekrar siparis/odeme onlenir).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cart_id BIGINT;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_cart;
ALTER TABLE orders ADD CONSTRAINT fk_orders_cart
    FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE SET NULL;
