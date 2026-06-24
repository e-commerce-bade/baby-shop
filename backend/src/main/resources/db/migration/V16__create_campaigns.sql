-- Kampanyalar artik sunucuda saklanir (eskiden yalnizca admin tarayicisinin localStorage'inda).
-- channels/placements virgulle ayrilmis; hero ayarlari duz kolonlarda; tarihler '-' olabildigi
-- icin metin olarak tutulur.
CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(60),
    type VARCHAR(30) NOT NULL,
    value VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL,
    audience VARCHAR(150),
    starts_at VARCHAR(30),
    ends_at VARCHAR(30),
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER NOT NULL DEFAULT 0,
    revenue VARCHAR(40),
    channels VARCHAR(255),
    placements VARCHAR(255),
    hero_background_type VARCHAR(20),
    hero_image_url VARCHAR(500),
    hero_background_color VARCHAR(20),
    hero_text_tone VARCHAR(20),
    hero_button_tone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Onceki localStorage demo kampanyalarini tohumla (storefront davranisinin surekliligi icin).
INSERT INTO campaigns
    (name, code, type, value, status, audience, starts_at, ends_at, usage_count, usage_limit,
     revenue, channels, placements, hero_background_type, hero_image_url, hero_background_color,
     hero_text_tone, hero_button_tone)
VALUES
    ('Yaz Baslangic Indirimi', 'YAZ15', 'percentage', '%15', 'active', 'Tum musteriler',
     '2026-06-01', '2026-06-16', 42, 250, '18,420 TL', 'Web,Sepet', 'homeHero,productListTop',
     'image', '/images/hero_2.png', '#F6E6E2', 'dark', 'brand'),
    ('Yenidogan Setlerinde Firsat', 'MINIK100', 'fixed', '100 TL', 'scheduled', 'Yenidogan kategorisi',
     '2026-06-08', '2026-06-22', 0, 120, '0 TL', 'Web,Urun detayi', 'homeBelowCategories',
     'color', '', '#F4ECE0', 'dark', 'brand'),
    ('Ucretsiz Kargo Esigi', 'KARGO0', 'shipping', 'Kargo', 'active', '750 TL ve uzeri sepet',
     '2026-05-20', '2026-06-30', 87, 500, '32,760 TL', 'Sepet,Checkout', 'homeBelowCategories',
     'color', '', '#DCE7EE', 'dark', 'dark'),
    ('2 Al 1 Aksesuar Indirimli', 'AKSESUAR', 'bundle', 'Paket', 'paused', 'Aksesuar urunleri',
     '2026-05-10', '2026-06-10', 16, 100, '5,840 TL', 'Web', '',
     'color', '', '#FAF6F1', 'dark', 'brand');
