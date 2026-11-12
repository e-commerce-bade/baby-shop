-- Admin stogu elle degistirdiginde zaman damgasi tutulur. Bu andan ONCE rezerve edilmis bir siparis
-- iptal edilirse (admin iptali / basarisiz odeme / sure asimi) stok geri EKLENMEZ: admin'in girdigi
-- deger gecerli kalir. Boylece "stogu 0'a cektik" denen urun, eski bir siparisin iptaliyle yeniden
-- satisa acilmaz.
ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS stock_adjusted_at TIMESTAMPTZ;

-- Siparisin stogu rezerve ettigi an. Eski siparislerde NULL'dir; o durumda created_at kullanilir.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stock_reserved_at TIMESTAMPTZ;
