-- Hesap-bagli favoriler: kullanici basina favori urunler (cihazlar arasi senkron, sizinti yok).
CREATE TABLE customer_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_favorites UNIQUE (user_id, product_id),
    CONSTRAINT fk_customer_favorites_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_favorites_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_favorites_user ON customer_favorites (user_id, created_at DESC);
